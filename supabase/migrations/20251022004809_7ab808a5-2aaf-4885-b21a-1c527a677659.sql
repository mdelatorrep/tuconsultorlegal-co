-- Trigger para crear automáticamente perfiles de usuarios regulares
-- Similar al existente para lawyer_profiles pero para user_profiles

CREATE OR REPLACE FUNCTION public.handle_regular_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo crear perfil si NO es un abogado y el perfil no existe
  IF NOT (NEW.raw_user_meta_data ? 'is_lawyer' AND (NEW.raw_user_meta_data ->> 'is_lawyer')::boolean)
     AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
    
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
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating regular user profile for % (email: %): %', NEW.id, NEW.email, SQLERRM;
    RETURN NEW; -- No fallar la autenticación por errores en el perfil
END;
$$;

-- Crear trigger que se ejecuta después de insertar en auth.users
DROP TRIGGER IF EXISTS on_auth_regular_user_created ON auth.users;
CREATE TRIGGER on_auth_regular_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_regular_user_profile();

-- Asegurar que user_profiles tiene las RLS policies correctas
-- Política para que usuarios vean su propio perfil
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Política para que usuarios actualicen su propio perfil
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política para que el trigger pueda insertar perfiles
DROP POLICY IF EXISTS "Allow profile creation via trigger" ON public.user_profiles;
CREATE POLICY "Allow profile creation via trigger"
ON public.user_profiles
FOR INSERT
WITH CHECK (true);

-- Logging de eventos de seguridad para accesos no autorizados
COMMENT ON FUNCTION public.log_security_event IS 'Función para registrar eventos de seguridad como accesos no autorizados, cambios de permisos, etc.';