-- Create helper function to create admin profiles for existing auth users
CREATE OR REPLACE FUNCTION public.create_admin_profile(
  auth_user_id UUID,
  admin_full_name TEXT,
  admin_email TEXT,
  is_super_admin BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_admin_id UUID;
BEGIN
  -- Verify the auth user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth_user_id) THEN
    RAISE EXCEPTION 'Auth user with ID % does not exist', auth_user_id;
  END IF;
  
  -- Insert the admin profile
  INSERT INTO public.admin_profiles (user_id, full_name, email, is_super_admin, active)
  VALUES (auth_user_id, admin_full_name, admin_email, is_super_admin, true)
  RETURNING id INTO new_admin_id;
  
  -- Log the admin creation
  INSERT INTO public.security_audit_log (
    event_type,
    user_identifier,
    details,
    created_at
  ) VALUES (
    'admin_profile_created',
    admin_email,
    jsonb_build_object(
      'admin_id', new_admin_id,
      'user_id', auth_user_id,
      'is_super_admin', is_super_admin
    ),
    now()
  );
  
  RETURN new_admin_id;
END;
$$;

-- Create function to migrate existing admin_accounts to admin_profiles
CREATE OR REPLACE FUNCTION public.migrate_admin_accounts_to_profiles()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  migrated_count INTEGER := 0;
  admin_record RECORD;
BEGIN
  -- Migrate admin_accounts with valid user_id to admin_profiles
  FOR admin_record IN 
    SELECT * FROM public.admin_accounts 
    WHERE user_id IS NOT NULL 
    AND active = true
    AND NOT EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = admin_accounts.user_id)
  LOOP
    INSERT INTO public.admin_profiles (
      user_id,
      full_name,
      email,
      is_super_admin,
      active,
      created_at,
      updated_at
    ) VALUES (
      admin_record.user_id,
      admin_record.full_name,
      admin_record.email,
      admin_record.is_super_admin,
      admin_record.active,
      admin_record.created_at,
      admin_record.updated_at
    );
    
    migrated_count := migrated_count + 1;
  END LOOP;
  
  -- Log the migration
  INSERT INTO public.security_audit_log (
    event_type,
    details,
    created_at
  ) VALUES (
    'admin_accounts_migrated',
    jsonb_build_object('migrated_count', migrated_count),
    now()
  );
  
  RETURN migrated_count;
END;
$$;

-- Run the migration
SELECT public.migrate_admin_accounts_to_profiles();