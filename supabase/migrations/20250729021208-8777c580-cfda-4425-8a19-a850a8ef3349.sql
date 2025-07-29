-- Add can_use_ai_tools permission to lawyer_profiles table
ALTER TABLE public.lawyer_profiles 
ADD COLUMN IF NOT EXISTS can_use_ai_tools BOOLEAN NOT NULL DEFAULT false;

-- Update the trigger function to include the new permission
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
      can_use_ai_tools,
      is_active
    )
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuario'),
      NEW.email,
      COALESCE((NEW.raw_user_meta_data ->> 'can_create_agents')::boolean, false),
      COALESCE((NEW.raw_user_meta_data ->> 'can_create_blogs')::boolean, false),
      COALESCE((NEW.raw_user_meta_data ->> 'can_use_ai_tools')::boolean, false),
      true
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Also update lawyer_tokens table to include the new permission for consistency
ALTER TABLE public.lawyer_tokens 
ADD COLUMN IF NOT EXISTS can_use_ai_tools BOOLEAN NOT NULL DEFAULT false;

-- Update existing lawyer profiles to have the new permission set to false
UPDATE public.lawyer_profiles 
SET can_use_ai_tools = false 
WHERE can_use_ai_tools IS NULL;

-- Update existing lawyer tokens to have the new permission set to false
UPDATE public.lawyer_tokens 
SET can_use_ai_tools = false 
WHERE can_use_ai_tools IS NULL;