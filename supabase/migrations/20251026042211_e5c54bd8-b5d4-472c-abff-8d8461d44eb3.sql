-- Fix: Evitar que los abogados tengan perfiles de usuario regular
-- El problema es que ambos triggers se ejecutan y crean perfiles duplicados

-- Actualizar el trigger para verificar también si existe un perfil de abogado
CREATE OR REPLACE FUNCTION public.handle_regular_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo crear perfil si:
  -- 1. NO es un abogado (no tiene is_lawyer en metadata)
  -- 2. NO existe un perfil de usuario regular
  -- 3. NO existe un perfil de abogado (para evitar duplicados)
  IF NOT (NEW.raw_user_meta_data ? 'is_lawyer' AND (NEW.raw_user_meta_data ->> 'is_lawyer')::boolean)
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
    RAISE LOG 'Skipping regular user profile creation for user: % (is_lawyer or profile exists)', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating regular user profile for % (email: %): %', NEW.id, NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Limpiar perfiles duplicados existentes: eliminar user_profiles que también tienen lawyer_profiles
DELETE FROM public.user_profiles 
WHERE id IN (
  SELECT lp.id 
  FROM public.lawyer_profiles lp
  INNER JOIN public.user_profiles up ON lp.id = up.id
);