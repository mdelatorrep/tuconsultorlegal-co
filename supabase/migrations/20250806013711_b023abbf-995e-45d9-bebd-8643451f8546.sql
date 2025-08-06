-- Create table for conversation blocks
CREATE TABLE public.conversation_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legal_agent_id UUID REFERENCES public.legal_agents(id) ON DELETE CASCADE,
  block_name TEXT NOT NULL,
  intro_phrase TEXT NOT NULL,
  placeholders JSONB NOT NULL DEFAULT '[]'::jsonb,
  block_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for field instructions
CREATE TABLE public.field_instructions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legal_agent_id UUID REFERENCES public.legal_agents(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  validation_rule TEXT,
  help_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_instructions ENABLE ROW LEVEL SECURITY;

-- Create policies for conversation_blocks
CREATE POLICY "Service role can manage conversation blocks" 
ON public.conversation_blocks 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Lawyers can manage their agent conversation blocks" 
ON public.conversation_blocks 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.legal_agents la 
    WHERE la.id = conversation_blocks.legal_agent_id 
    AND la.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.legal_agents la 
    WHERE la.id = conversation_blocks.legal_agent_id 
    AND la.created_by = auth.uid()
  )
);

-- Create policies for field_instructions
CREATE POLICY "Service role can manage field instructions" 
ON public.field_instructions 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Lawyers can manage their agent field instructions" 
ON public.field_instructions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.legal_agents la 
    WHERE la.id = field_instructions.legal_agent_id 
    AND la.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.legal_agents la 
    WHERE la.id = field_instructions.legal_agent_id 
    AND la.created_by = auth.uid()
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_conversation_blocks_updated_at
BEFORE UPDATE ON public.conversation_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_field_instructions_updated_at
BEFORE UPDATE ON public.field_instructions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();