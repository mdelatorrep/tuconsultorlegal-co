-- Fix legal_agents status constraint to include 'approved'
ALTER TABLE public.legal_agents 
DROP CONSTRAINT IF EXISTS legal_agents_status_check;

ALTER TABLE public.legal_agents 
ADD CONSTRAINT legal_agents_status_check CHECK (status IN ('draft', 'pending_review', 'approved', 'active', 'suspended'));