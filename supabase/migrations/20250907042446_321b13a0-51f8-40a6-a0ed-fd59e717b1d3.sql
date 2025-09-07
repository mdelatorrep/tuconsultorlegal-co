-- First, let's create the missing lawyer profile for the authenticated user
-- We'll insert the profile manually and then check if the trigger is working

-- Check if profile exists and create if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.lawyer_profiles 
    WHERE id = '8dbffb69-26f9-427a-9ee1-01c6407edcac'
  ) THEN
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
      '8dbffb69-26f9-427a-9ee1-01c6407edcac', 
      'Manuel',
      'mdelatorrep@gmail.com',
      false,
      false,
      false,
      true
    );
    
    RAISE LOG 'Created missing lawyer profile for user: 8dbffb69-26f9-427a-9ee1-01c6407edcac';
  ELSE
    RAISE LOG 'Lawyer profile already exists for user: 8dbffb69-26f9-427a-9ee1-01c6407edcac';
  END IF;
END
$$;

-- Update the trigger to be more robust and handle edge cases
CREATE OR REPLACE FUNCTION public.handle_new_lawyer_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create profile if user has lawyer metadata AND profile doesn't exist
  IF NEW.raw_user_meta_data ? 'is_lawyer' 
     AND (NEW.raw_user_meta_data ->> 'is_lawyer')::boolean 
     AND NOT EXISTS (SELECT 1 FROM public.lawyer_profiles WHERE id = NEW.id) THEN
    
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
      
    RAISE LOG 'Lawyer profile created/updated for user: % (email: %)', NEW.id, NEW.email;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating lawyer profile for % (email: %): %', NEW.id, NEW.email, SQLERRM;
    RETURN NEW; -- Don't fail authentication due to profile errors
END;
$function$;