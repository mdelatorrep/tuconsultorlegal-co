-- Add tool_type column to async_research_tasks to support multiple task types
ALTER TABLE public.async_research_tasks 
ADD COLUMN IF NOT EXISTS tool_type text DEFAULT 'research';

-- Add title column for better UX
ALTER TABLE public.async_research_tasks 
ADD COLUMN IF NOT EXISTS title text;

-- Enable realtime for this table
ALTER TABLE public.async_research_tasks REPLICA IDENTITY FULL;

-- Add to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'async_research_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.async_research_tasks;
  END IF;
END $$;

-- Create index for faster lawyer queries
CREATE INDEX IF NOT EXISTS idx_async_research_tasks_lawyer_status 
ON public.async_research_tasks(lawyer_id, status) 
WHERE status = 'pending';