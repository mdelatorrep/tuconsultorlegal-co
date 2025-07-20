-- Remove the existing unique constraint on name
ALTER TABLE public.legal_agents DROP CONSTRAINT legal_agents_name_unique;

-- Create a new partial unique constraint that only applies to active agents
CREATE UNIQUE INDEX legal_agents_name_active_unique 
ON public.legal_agents (name) 
WHERE status = 'active';

-- This allows multiple agents with the same name as long as only one is active