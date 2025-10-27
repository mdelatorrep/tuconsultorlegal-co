-- Drop old triggers that might be causing duplicates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_new_user_created ON auth.users;

-- Drop the old handle_new_user function that handles both types
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate triggers with proper naming and order
-- IMPORTANT: Triggers execute in alphabetical order, so we name them accordingly

-- Trigger 1: Handle lawyer profile creation (executes first alphabetically)
DROP TRIGGER IF EXISTS trigger_01_create_lawyer_profile ON auth.users;
CREATE TRIGGER trigger_01_create_lawyer_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_lawyer_user();

-- Trigger 2: Handle regular user profile creation (executes second)
DROP TRIGGER IF EXISTS trigger_02_create_user_profile ON auth.users;
CREATE TRIGGER trigger_02_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_regular_user_profile();

-- Ensure the functions have proper validation logic
-- Update handle_new_lawyer_user to be more explicit
CREATE OR REPLACE FUNCTION public.handle_new_lawyer_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create lawyer profile if:
  -- 1. User has is_lawyer metadata set to true
  -- 2. No lawyer profile exists for this user
  -- 3. No regular user profile exists (to prevent duplicates)
  IF (NEW.raw_user_meta_data ? 'is_lawyer' 
      AND (NEW.raw_user_meta_data ->> 'is_lawyer')::boolean = true)
     AND NOT EXISTS (SELECT 1 FROM public.lawyer_profiles WHERE id = NEW.id)
     AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
    
    INSERT INTO public.lawyer_profiles (
      id, 
      full_name, 
      email,
      can_create_agents,
      can_create_blogs,
      can_use_ai_tools,
      is_active
    )
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email, 'Usuario'),
      NEW.email,
      COALESCE((NEW.raw_user_meta_data ->> 'can_create_agents')::boolean, false),
      COALESCE((NEW.raw_user_meta_data ->> 'can_create_blogs')::boolean, false),
      COALESCE((NEW.raw_user_meta_data ->> 'can_use_ai_tools')::boolean, false),
      true
    );
      
    RAISE LOG 'Lawyer profile created for user: % (email: %)', NEW.id, NEW.email;
  ELSE
    RAISE LOG 'Skipping lawyer profile creation for user: % (not a lawyer or profile exists)', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating lawyer profile for % (email: %): %', NEW.id, NEW.email, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Update handle_regular_user_profile to be more explicit
CREATE OR REPLACE FUNCTION public.handle_regular_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create regular user profile if:
  -- 1. User does NOT have is_lawyer metadata or it's set to false
  -- 2. No user profile exists for this user
  -- 3. No lawyer profile exists (to prevent duplicates)
  IF (NOT (NEW.raw_user_meta_data ? 'is_lawyer') 
      OR (NEW.raw_user_meta_data ->> 'is_lawyer')::boolean = false)
     AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id)
     AND NOT EXISTS (SELECT 1 FROM public.lawyer_profiles WHERE id = NEW.id) THEN
    
    INSERT INTO public.user_profiles (
      id,
      full_name,
      email
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
      NEW.email
    );
    
    RAISE LOG 'Regular user profile created for user: % (email: %)', NEW.id, NEW.email;
  ELSE
    RAISE LOG 'Skipping regular user profile creation for user: % (is lawyer or profile exists)', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating regular user profile for % (email: %): %', NEW.id, NEW.email, SQLERRM;
    RETURN NEW;
END;
$function$;