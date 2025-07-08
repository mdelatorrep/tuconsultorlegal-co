-- Temporarily allow agent creation without authentication for testing
-- This should be replaced with proper authentication in production
DROP POLICY "Lawyers can create agents" ON public.legal_agents;

CREATE POLICY "Allow agent creation for testing" 
ON public.legal_agents 
FOR INSERT 
WITH CHECK (true);