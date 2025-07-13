-- Add created_by field to track which lawyer created each agent
ALTER TABLE public.legal_agents 
ADD COLUMN created_by UUID REFERENCES public.lawyer_tokens(id);

-- Create index for better performance on filtering by created_by
CREATE INDEX idx_legal_agents_created_by ON public.legal_agents(created_by);

-- Update existing agents to have a null created_by (can be manually assigned later)
-- This allows existing data to continue working while new agents will have proper tracking