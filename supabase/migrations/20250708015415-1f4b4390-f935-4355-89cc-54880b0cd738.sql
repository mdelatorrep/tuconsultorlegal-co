-- Add admin role functionality to lawyer accounts
ALTER TABLE public.lawyer_accounts 
ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Update existing account to be admin for testing
UPDATE public.lawyer_accounts 
SET is_admin = true 
WHERE email = 'abogado@consultorjalegal.com';

-- Update legal agents table to have proper status tracking
ALTER TABLE public.legal_agents 
DROP CONSTRAINT IF EXISTS legal_agents_status_check;

ALTER TABLE public.legal_agents 
ADD CONSTRAINT legal_agents_status_check CHECK (status IN ('draft', 'pending_review', 'active', 'suspended'));

-- Update default status for new agents
ALTER TABLE public.legal_agents 
ALTER COLUMN status SET DEFAULT 'pending_review';

-- Create policy for admin access to all agents
CREATE POLICY "Admins can manage all agents" 
ON public.legal_agents 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.lawyer_accounts 
  WHERE id = (
    SELECT id FROM public.lawyer_accounts 
    WHERE access_token = current_setting('request.headers')::json->>'authorization'
  ) AND is_admin = true
));

-- Create policy for admin access to all lawyer accounts
CREATE POLICY "Admins can manage lawyer accounts" 
ON public.lawyer_accounts 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.lawyer_accounts 
  WHERE id = (
    SELECT id FROM public.lawyer_accounts 
    WHERE access_token = current_setting('request.headers')::json->>'authorization'
  ) AND is_admin = true
));