-- PHASE 1: CRITICAL SECURITY FIXES - Step 1: Remove dependent policies first

-- 1. Remove all policies that depend on admin_accounts.session_token
DROP POLICY IF EXISTS "Admin can delete lawyer accounts" ON public.lawyer_accounts;
DROP POLICY IF EXISTS "Admins can manage admin accounts" ON public.admin_accounts;

-- 2. Remove any other policies that might reference session_token
DROP POLICY IF EXISTS "Admin access to lawyer accounts" ON public.lawyer_accounts;

-- 3. Now we can safely remove the session_token columns
ALTER TABLE public.admin_accounts 
DROP COLUMN IF EXISTS session_token CASCADE,
DROP COLUMN IF EXISTS token_expires_at CASCADE;

-- 4. Fix password verification to use proper bcrypt hashing
CREATE OR REPLACE FUNCTION public.verify_admin_password(password text, email_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  stored_hash TEXT;
BEGIN
  -- Get password hash from admin_accounts (NOT lawyer_accounts)
  SELECT password_hash INTO stored_hash
  FROM public.admin_accounts 
  WHERE email = email_param AND active = true;
  
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Use proper bcrypt verification with pgcrypto
  RETURN stored_hash = crypt(password, stored_hash);
END;
$function$;

-- 5. Update security functions to use auth.uid() instead of session tokens
CREATE OR REPLACE FUNCTION public.is_current_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
    AND active = true
  );
$function$;