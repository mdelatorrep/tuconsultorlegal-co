-- Fix infinite recursion in admin_accounts RLS policies

-- First, drop the problematic policy
DROP POLICY IF EXISTS "Admins can manage admin accounts" ON public.admin_accounts;

-- Create a security definer function to check if current user is an admin
-- This prevents the recursion issue
CREATE OR REPLACE FUNCTION public.is_current_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_accounts 
    WHERE session_token = current_setting('request.headers', true)::json->>'authorization'
    AND active = true 
    AND (token_expires_at IS NULL OR token_expires_at > now())
  );
$$;

-- Create new policy using the security definer function
CREATE POLICY "Admins can manage admin accounts" ON public.admin_accounts
FOR ALL USING (public.is_current_admin());