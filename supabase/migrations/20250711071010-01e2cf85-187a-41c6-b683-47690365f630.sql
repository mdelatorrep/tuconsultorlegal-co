-- Fix RLS policies for lawyer_accounts to allow admin access for DELETE operations

-- Drop the existing problematic policies and recreate them correctly
DROP POLICY IF EXISTS "Admin access to lawyer accounts" ON public.lawyer_accounts;

-- Create a new policy that allows admins to delete lawyers
CREATE POLICY "Admin can delete lawyer accounts" ON public.lawyer_accounts
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.admin_accounts 
    WHERE session_token = current_setting('request.headers', true)::json->>'authorization'
    AND active = true 
    AND (token_expires_at IS NULL OR token_expires_at > now())
  )
);

-- Recreate the general admin access policy
CREATE POLICY "Admin access to lawyer accounts" ON public.lawyer_accounts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.admin_accounts 
    WHERE session_token = current_setting('request.headers', true)::json->>'authorization'
    AND active = true 
    AND (token_expires_at IS NULL OR token_expires_at > now())
  )
);