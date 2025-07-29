-- Ensure the trigger for creating lawyer profiles exists and works correctly
CREATE OR REPLACE FUNCTION public.handle_new_lawyer_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Recreate the trigger to ensure it's active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_lawyer_user();

-- Re-enable RLS on lawyer_profiles with corrected policies
ALTER TABLE public.lawyer_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Lawyers can view their own profile" ON public.lawyer_profiles;
DROP POLICY IF EXISTS "Lawyers can update their own profile" ON public.lawyer_profiles;

-- Create new policies that work correctly
CREATE POLICY "Lawyers can view their own profile" 
ON public.lawyer_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Lawyers can update their own profile" 
ON public.lawyer_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

-- Add policy for inserting profiles (needed for the trigger)
CREATE POLICY "Allow profile creation via trigger" 
ON public.lawyer_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (true);