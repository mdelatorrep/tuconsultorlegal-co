-- SECURITY FIXES - Phase 2: Address Security Linter Warnings

-- 1. Fix Function Search Path Mutable - Set search_path for all functions
ALTER FUNCTION public.has_role(_user_id uuid, _role app_role) SET search_path = 'public';
ALTER FUNCTION public.get_user_role() SET search_path = 'public';
ALTER FUNCTION public.auto_create_openai_agent() SET search_path = 'public';
ALTER FUNCTION public.log_security_event(event_type text, user_identifier text, details jsonb, ip_address text) SET search_path = 'public';
ALTER FUNCTION public.update_admin_profiles_updated_at() SET search_path = 'public';
ALTER FUNCTION public.generate_secure_lawyer_token() SET search_path = 'public';
ALTER FUNCTION public.handle_new_lawyer_user() SET search_path = 'public';
ALTER FUNCTION public.create_admin_profile(auth_user_id uuid, admin_full_name text, admin_email text, is_super_admin boolean) SET search_path = 'public';
ALTER FUNCTION public.migrate_admin_accounts_to_profiles() SET search_path = 'public';
ALTER FUNCTION public.update_sla_status() SET search_path = 'public';
ALTER FUNCTION public.issue_certificate_on_completion() SET search_path = 'public';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';

-- 2. Additional security hardening - Create stricter password validation function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Require minimum 8 characters, at least one uppercase, one lowercase, one number
  RETURN length(password) >= 8 
    AND password ~ '[A-Z]' 
    AND password ~ '[a-z]' 
    AND password ~ '[0-9]';
END;
$$;

-- 3. Enhanced input sanitization function
CREATE OR REPLACE FUNCTION public.sanitize_input(input_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Remove potentially dangerous characters and limit length
  RETURN TRIM(REGEXP_REPLACE(
    SUBSTRING(input_text, 1, 1000), 
    '[<>"\'';&]', 
    '', 
    'g'
  ));
END;
$$;

-- 4. Create rate limiting helper function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  user_identifier text, 
  action_type text, 
  max_attempts integer DEFAULT 5,
  time_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  attempt_count integer;
BEGIN
  -- Check attempts in the time window
  SELECT COUNT(*) INTO attempt_count
  FROM public.security_audit_log
  WHERE user_identifier = check_rate_limit.user_identifier
    AND event_type = action_type
    AND created_at > (now() - (time_window_minutes || ' minutes')::interval);
    
  RETURN attempt_count < max_attempts;
END;
$$;

-- 5. Log security improvements
SELECT log_security_event(
  'security_functions_enhanced',
  'system',
  jsonb_build_object(
    'functions_secured', ARRAY['search_path_fixed', 'password_validation', 'input_sanitization', 'rate_limiting'],
    'security_level', 'high',
    'phase', 'phase_2_function_security'
  )
);