-- PHASE 1: CRITICAL SECURITY FIXES - Step 3: Complete remaining security fixes

-- 1. Ensure admin_accounts.user_id is properly linked to auth.users
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

-- 2. Create proper trigger to sync admin_profiles with auth.users
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

-- 3. Add proper logging for security events
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

-- 4. Enhance lawyer token security
CREATE OR REPLACE FUNCTION public.generate_secure_lawyer_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_length INTEGER := 64;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..token_length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.lawyer_tokens WHERE access_token = result) LOOP
    result := '';
    FOR i IN 1..token_length LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$;

-- 5. Add input validation function for emails
CREATE OR REPLACE FUNCTION public.is_valid_email(email_input text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN email_input ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;