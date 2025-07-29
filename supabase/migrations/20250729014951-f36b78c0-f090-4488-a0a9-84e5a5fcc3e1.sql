-- Update RLS policies for agent_drafts to use lawyer_profiles directly
DROP POLICY IF EXISTS "Lawyers can manage their own drafts" ON public.agent_drafts;

CREATE POLICY "Lawyers can manage their own drafts" 
ON public.agent_drafts 
FOR ALL
TO authenticated
USING (lawyer_id = auth.uid())
WITH CHECK (lawyer_id = auth.uid());

-- Update RLS policies for legal_agents to use lawyer_profiles directly
DROP POLICY IF EXISTS "Lawyers can manage their own agents" ON public.legal_agents;

CREATE POLICY "Lawyers can manage their own agents" 
ON public.legal_agents 
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());