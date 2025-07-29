-- Mejorar el trigger para manejar conflictos de registros duplicados
CREATE OR REPLACE FUNCTION public.handle_new_lawyer_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo crear perfil si tiene metadata de abogado
  IF NEW.raw_user_meta_data ? 'is_lawyer' AND (NEW.raw_user_meta_data ->> 'is_lawyer')::boolean THEN
    
    -- Usar INSERT ... ON CONFLICT para evitar errores de duplicados
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
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      can_create_agents = EXCLUDED.can_create_agents,
      can_create_blogs = EXCLUDED.can_create_blogs,
      can_use_ai_tools = EXCLUDED.can_use_ai_tools,
      is_active = EXCLUDED.is_active,
      updated_at = now();
      
    RAISE LOG 'Lawyer profile created/updated for user: %', NEW.email;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating lawyer profile for %: %', NEW.email, SQLERRM;
    RETURN NEW; -- No fallar la autenticación por errores del perfil
END;
$function$;