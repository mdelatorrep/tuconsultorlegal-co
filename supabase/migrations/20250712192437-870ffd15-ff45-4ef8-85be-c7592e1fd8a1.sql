-- PHASE 1: CRITICAL SECURITY FIXES - Step 2: Add proper RLS policies and constraints

-- 1. Enable RLS on auth_rate_limits table (currently missing)
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for auth_rate_limits - only system functions should access
CREATE POLICY "System functions only access rate limits" 
ON public.auth_rate_limits 
FOR ALL 
USING (false); -- Deny all direct access, only functions can use

-- 2. Create proper admin access policies using admin_profiles instead of session tokens
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

-- 3. Recreate admin_accounts policy using proper auth
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

-- 4. Ensure admin_accounts.user_id is properly linked to auth.users
-- Add foreign key constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'admin_accounts_user_id_fkey'
    ) THEN
        ALTER TABLE public.admin_accounts 
        ADD CONSTRAINT admin_accounts_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Create proper trigger to sync admin_profiles with auth.users
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Check if this user should be an admin (based on email or other criteria)
  -- This is a placeholder - adjust logic as needed
  IF NEW.email LIKE '%@admin.%' OR NEW.raw_user_meta_data->>'role' = 'admin' THEN
    INSERT INTO public.admin_profiles (user_id, full_name, is_super_admin)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      CASE WHEN NEW.raw_user_meta_data->>'role' = 'super_admin' THEN true ELSE false END
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new admin users
DROP TRIGGER IF EXISTS on_auth_admin_user_created ON auth.users;
CREATE TRIGGER on_auth_admin_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_admin_user();

-- 6. Clean up broken functions that reference removed columns
DROP FUNCTION IF EXISTS public.validate_admin_session(text);
DROP FUNCTION IF EXISTS public.cleanup_expired_admin_sessions();
DROP FUNCTION IF EXISTS public.is_current_user_admin_by_session();

-- 7. Secure legal_agents RLS policy
DROP POLICY IF EXISTS "Admin access to legal agents" ON public.legal_agents;
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

-- 8. Add proper logging for security events
CREATE OR REPLACE FUNCTION public.log_admin_action(
  action_type text,
  details jsonb DEFAULT NULL::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.security_events (
    event_type, 
    user_id, 
    details,
    ip_address,
    user_agent
  )
  VALUES (
    'admin_' || action_type,
    auth.uid(),
    details,
    inet(current_setting('request.headers', true)::json->>'x-forwarded-for'),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;