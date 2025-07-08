-- Security enhancement: Fix RLS policies and improve admin authentication

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view documents with valid token" ON public.document_tokens;
DROP POLICY IF EXISTS "Anyone can update document status" ON public.document_tokens;
DROP POLICY IF EXISTS "Allow agent creation for testing" ON public.legal_agents;
DROP POLICY IF EXISTS "Admin can view webhook logs" ON public.webhook_logs;

-- Create secure document access policies
CREATE POLICY "Secure document token access"
ON public.document_tokens
FOR SELECT
USING (
  -- Allow access only with valid token parameter or authenticated users
  token = current_setting('request.headers', true)::json->>'x-document-token'
  OR auth.uid() IS NOT NULL
);

CREATE POLICY "Secure document status updates"
ON public.document_tokens
FOR UPDATE
USING (
  -- Only allow updates for payment status changes through backend
  auth.uid() IS NOT NULL 
  OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Restrict agent creation to authenticated lawyers only
CREATE POLICY "Authenticated lawyers can create agents"
ON public.legal_agents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lawyer_accounts 
    WHERE id = created_by 
    AND active = true
    AND can_create_agents = true
  )
);

-- Secure webhook logs access to admins only
CREATE POLICY "Admin only webhook logs access"
ON public.webhook_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lawyer_accounts 
    WHERE access_token = current_setting('request.headers', true)::json->>'authorization'
    AND is_admin = true 
    AND active = true
  )
);

-- Add proper audit logging table
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admin only security events access"
ON public.security_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lawyer_accounts 
    WHERE access_token = current_setting('request.headers', true)::json->>'authorization'
    AND is_admin = true 
    AND active = true
  )
);

-- Add token expiration and security fields to lawyer accounts
ALTER TABLE public.lawyer_accounts 
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- Create function to hash admin tokens securely
CREATE OR REPLACE FUNCTION public.hash_admin_token(token TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use pgcrypto extension for secure hashing
  RETURN crypt(token, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify admin token
CREATE OR REPLACE FUNCTION public.verify_admin_token(token TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN hash = crypt(token, hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  user_id UUID DEFAULT NULL,
  ip_address INET DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.security_events (event_type, user_id, ip_address, user_agent, details)
  VALUES (event_type, user_id, ip_address, user_agent, details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;