-- First, check current policies and drop ALL problematic ones
SELECT 'DROP POLICY "' || policyname || '" ON ' || schemaname || '.' || tablename || ';' 
FROM pg_policies 
WHERE tablename IN ('lawyer_accounts', 'legal_agents') 
AND policyname LIKE '%Admin%';

-- Drop all existing admin policies to start fresh
DROP POLICY IF EXISTS "Admins can manage lawyer accounts" ON public.lawyer_accounts;
DROP POLICY IF EXISTS "Admins can manage all agents" ON public.legal_agents;
DROP POLICY IF EXISTS "Only admins can manage lawyer accounts" ON public.lawyer_accounts;

-- Create the security definer function (if not exists)
CREATE OR REPLACE FUNCTION public.is_admin_user(auth_token TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  token_to_check TEXT;
BEGIN
  -- Use provided token or try to get from headers
  token_to_check := COALESCE(auth_token, 
    CASE 
      WHEN current_setting('request.headers', true) IS NOT NULL 
      THEN current_setting('request.headers', true)::json->>'authorization'
      ELSE NULL 
    END
  );
  
  IF token_to_check IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.lawyer_accounts 
    WHERE access_token = token_to_check 
    AND is_admin = true 
    AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create simple admin policies using the function
CREATE POLICY "Admin access to lawyer accounts" 
ON public.lawyer_accounts 
FOR ALL 
TO public
USING (public.is_admin_user());

CREATE POLICY "Admin access to legal agents" 
ON public.legal_agents 
FOR ALL 
TO public  
USING (public.is_admin_user());