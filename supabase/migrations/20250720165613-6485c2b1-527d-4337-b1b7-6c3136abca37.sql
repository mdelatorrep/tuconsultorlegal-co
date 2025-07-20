-- Create function to auto-create OpenAI agents when legal agents are approved
CREATE OR REPLACE FUNCTION auto_create_openai_agent()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Insert a job to create the OpenAI agent asynchronously
    INSERT INTO public.openai_agent_jobs (
      legal_agent_id,
      status,
      created_at
    ) VALUES (
      NEW.id,
      'pending',
      NOW()
    );
    
    RAISE LOG 'Queued OpenAI agent creation for legal agent: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create table to queue OpenAI agent creation jobs
CREATE TABLE IF NOT EXISTS public.openai_agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_agent_id UUID NOT NULL REFERENCES public.legal_agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on the jobs table
ALTER TABLE public.openai_agent_jobs ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage OpenAI agent jobs"
ON public.openai_agent_jobs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add trigger to legal_agents table
DROP TRIGGER IF EXISTS trigger_auto_create_openai_agent ON public.legal_agents;
CREATE TRIGGER trigger_auto_create_openai_agent
  AFTER UPDATE ON public.legal_agents
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_openai_agent();

-- Add analytics columns to legal_agents for tracking OpenAI usage
ALTER TABLE public.legal_agents 
ADD COLUMN IF NOT EXISTS openai_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS openai_conversations_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS openai_success_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_openai_activity TIMESTAMP WITH TIME ZONE;

-- Update trigger for updated_at
CREATE TRIGGER update_openai_agent_jobs_updated_at
  BEFORE UPDATE ON public.openai_agent_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();