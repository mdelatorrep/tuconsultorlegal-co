-- Fix function search path warnings by setting search_path explicitly

-- Fix generate_secure_lawyer_token function
CREATE OR REPLACE FUNCTION public.generate_secure_lawyer_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  token_length INTEGER := 64;
  result TEXT := '';
  i INTEGER;
  random_index INTEGER;
BEGIN
  -- Use cryptographically secure random generation
  FOR i IN 1..token_length LOOP
    random_index := (abs(hashtext(gen_random_uuid()::text)) % length(token_chars)) + 1;
    result := result || substr(token_chars, random_index, 1);
  END LOOP;
  
  -- Ensure uniqueness by checking against existing tokens
  WHILE EXISTS (SELECT 1 FROM public.lawyer_tokens WHERE access_token = result) LOOP
    result := '';
    FOR i IN 1..token_length LOOP
      random_index := (abs(hashtext(gen_random_uuid()::text)) % length(token_chars)) + 1;
      result := result || substr(token_chars, random_index, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Fix log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  user_identifier TEXT DEFAULT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    event_type,
    user_identifier,
    details,
    ip_address,
    created_at
  ) VALUES (
    event_type,
    user_identifier,
    details,
    ip_address,
    now()
  );
END;
$$;

-- Fix update_admin_profiles_updated_at function
CREATE OR REPLACE FUNCTION public.update_admin_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix handle_new_lawyer_user function
CREATE OR REPLACE FUNCTION public.handle_new_lawyer_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Solo crear perfil si tiene metadata de abogado
  IF NEW.raw_user_meta_data ? 'is_lawyer' AND (NEW.raw_user_meta_data ->> 'is_lawyer')::boolean THEN
    INSERT INTO public.lawyer_profiles (
      id, 
      full_name, 
      email,
      can_create_agents,
      can_create_blogs,
      is_active
    )
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuario'),
      NEW.email,
      COALESCE((NEW.raw_user_meta_data ->> 'can_create_agents')::boolean, false),
      COALESCE((NEW.raw_user_meta_data ->> 'can_create_blogs')::boolean, false),
      true
    );
  END IF;
  RETURN NEW;
END;
$$;