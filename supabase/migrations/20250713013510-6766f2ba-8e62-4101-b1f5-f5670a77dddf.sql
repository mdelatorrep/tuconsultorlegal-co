-- Create table for agent drafts
CREATE TABLE public.agent_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL,
  draft_name TEXT NOT NULL,
  step_completed INTEGER NOT NULL DEFAULT 1,
  doc_name TEXT,
  doc_desc TEXT,
  doc_cat TEXT,
  target_audience TEXT DEFAULT 'personas',
  doc_template TEXT,
  initial_prompt TEXT,
  sla_hours INTEGER DEFAULT 4,
  sla_enabled BOOLEAN DEFAULT true,
  lawyer_suggested_price TEXT,
  ai_results JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.agent_drafts ENABLE ROW LEVEL SECURITY;

-- Create policies for drafts (only accessible through service role for now)
CREATE POLICY "Service role can manage agent drafts" 
ON public.agent_drafts 
FOR ALL 
USING (true);

-- Add foreign key reference to lawyer_tokens
ALTER TABLE public.agent_drafts 
ADD CONSTRAINT agent_drafts_lawyer_id_fkey 
FOREIGN KEY (lawyer_id) REFERENCES public.lawyer_tokens(id) ON DELETE CASCADE;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_agent_drafts_updated_at
BEFORE UPDATE ON public.agent_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_agent_drafts_lawyer_id ON public.agent_drafts(lawyer_id);
CREATE INDEX idx_agent_drafts_updated_at ON public.agent_drafts(updated_at DESC);