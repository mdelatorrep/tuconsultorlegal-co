-- PHASE 1: CRITICAL SECURITY FIXES - Step 2b: Fix function dependencies first

-- 1. Remove the policy that depends on is_current_user_admin_by_session
DROP POLICY IF EXISTS "Admin access to legal agents" ON public.legal_agents;

-- 2. Now we can safely drop the broken functions
DROP FUNCTION IF EXISTS public.validate_admin_session(text);
DROP FUNCTION IF EXISTS public.cleanup_expired_admin_sessions();
DROP FUNCTION IF EXISTS public.is_current_user_admin_by_session();

-- 3. Enable RLS on auth_rate_limits table (currently missing)
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for auth_rate_limits - only system functions should access
CREATE POLICY "System functions only access rate limits" 
ON public.auth_rate_limits 
FOR ALL 
USING (false); -- Deny all direct access, only functions can use

-- 4. Create proper admin access policies using admin_profiles instead of session tokens
CREATE POLICY "Admin access to lawyer accounts via profiles" 
ON public.lawyer_accounts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles ap
    WHERE ap.user_id = auth.uid() 
    AND ap.active = true
  )
);

-- 5. Recreate admin_accounts policy using proper auth
CREATE POLICY "Admins can manage admin accounts via profiles" 
ON public.admin_accounts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles ap
    WHERE ap.user_id = auth.uid() 
    AND ap.active = true 
    AND ap.is_super_admin = true
  )
);

-- 6. Secure legal_agents RLS policy with proper admin check
CREATE POLICY "Admin access to legal agents via profiles" 
ON public.legal_agents 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles ap
    WHERE ap.user_id = auth.uid() 
    AND ap.active = true
  )
);