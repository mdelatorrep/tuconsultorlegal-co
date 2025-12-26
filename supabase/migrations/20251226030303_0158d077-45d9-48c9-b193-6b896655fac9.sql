-- Create table for async research tasks
CREATE TABLE public.async_research_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  openai_response_id TEXT NOT NULL,
  query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  error_message TEXT,
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add index for faster lookups
CREATE INDEX idx_async_research_tasks_lawyer ON async_research_tasks(lawyer_id);
CREATE INDEX idx_async_research_tasks_status ON async_research_tasks(status);
CREATE INDEX idx_async_research_tasks_openai_id ON async_research_tasks(openai_response_id);

-- Enable RLS
ALTER TABLE public.async_research_tasks ENABLE ROW LEVEL SECURITY;

-- Lawyers can only see their own tasks
CREATE POLICY "Lawyers can view their own research tasks"
ON public.async_research_tasks
FOR SELECT
USING (auth.uid() = lawyer_id);

-- Lawyers can create their own tasks
CREATE POLICY "Lawyers can create their own research tasks"
ON public.async_research_tasks
FOR INSERT
WITH CHECK (auth.uid() = lawyer_id);

-- Add trigger for updated_at
CREATE TRIGGER update_async_research_tasks_updated_at
BEFORE UPDATE ON public.async_research_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();