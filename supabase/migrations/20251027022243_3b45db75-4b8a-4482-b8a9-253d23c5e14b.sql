-- ============================================
-- SOLUCIÓN ESTRUCTURAL COMPLETA: AUTENTICACIÓN
-- ============================================
-- Este script resuelve el problema de perfiles duplicados
-- donde abogados terminan con ambos user_profiles y lawyer_profiles

-- 1. ELIMINAR TRIGGERS OBSOLETOS/DUPLICADOS
-- ============================================
DROP TRIGGER IF EXISTS on_auth_regular_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_lawyer_auth_user_created ON auth.users;

-- 2. LIMPIAR PERFILES DUPLICADOS EXISTENTES
-- ============================================
-- Eliminar user_profiles de usuarios que también tienen lawyer_profiles
DELETE FROM public.user_profiles 
WHERE id IN (
  SELECT up.id 
  FROM public.user_profiles up
  INNER JOIN public.lawyer_profiles lp ON up.id = lp.id
);

-- Log de limpieza
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE LOG 'Cleaned up % duplicate user profiles for lawyers', deleted_count;
END $$;

-- 3. CREAR TABLA DE REGISTRO DE TIPOS DE USUARIO
-- ============================================
-- Esta tabla previene condiciones de carrera entre triggers
CREATE TABLE IF NOT EXISTS public.user_type_registry (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('lawyer', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.user_type_registry ENABLE ROW LEVEL SECURITY;

-- Política: usuarios pueden ver su propio tipo
CREATE POLICY "Users can view their own type"
  ON public.user_type_registry
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: service role puede gestionar todo
CREATE POLICY "Service role can manage user types"
  ON public.user_type_registry
  FOR ALL
  USING (auth.role() = 'service_role');

-- 4. MEJORAR TRIGGER DE CREACIÓN DE PERFIL DE ABOGADO
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_lawyer_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo crear perfil de abogado si:
  -- 1. Usuario tiene is_lawyer metadata = true
  -- 2. No existe perfil de abogado
  -- 3. No existe perfil de usuario (prevenir duplicados)
  IF (NEW.raw_user_meta_data ? 'is_lawyer' 
      AND (NEW.raw_user_meta_data ->> 'is_lawyer')::boolean = true)
     AND NOT EXISTS (SELECT 1 FROM public.lawyer_profiles WHERE id = NEW.id)
     AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
    
    -- Registrar tipo de usuario PRIMERO
    INSERT INTO public.user_type_registry (user_id, user_type)
    VALUES (NEW.id, 'lawyer')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Crear perfil de abogado
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
      
    RAISE LOG '[AUTH] ✅ Lawyer profile created for user: % (email: %)', NEW.id, NEW.email;
  ELSE
    RAISE LOG '[AUTH] ⏭️  Skipping lawyer profile creation for user: % (not a lawyer or profile exists)', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG '[AUTH] ❌ Error creating lawyer profile for % (email: %): %', NEW.id, NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- 5. MEJORAR TRIGGER DE CREACIÓN DE PERFIL DE USUARIO
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_regular_user_profile()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo crear perfil de usuario si:
  -- 1. Usuario NO tiene is_lawyer metadata o está en false
  -- 2. No existe perfil de usuario
  -- 3. No existe perfil de abogado (prevenir duplicados)
  -- 4. No está registrado como lawyer en user_type_registry
  IF (NOT (NEW.raw_user_meta_data ? 'is_lawyer') 
      OR (NEW.raw_user_meta_data ->> 'is_lawyer')::boolean = false)
     AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id)
     AND NOT EXISTS (SELECT 1 FROM public.lawyer_profiles WHERE id = NEW.id)
     AND NOT EXISTS (SELECT 1 FROM public.user_type_registry WHERE user_id = NEW.id AND user_type = 'lawyer') THEN
    
    -- Registrar tipo de usuario PRIMERO
    INSERT INTO public.user_type_registry (user_id, user_type)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Crear perfil de usuario
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
    
    RAISE LOG '[AUTH] ✅ Regular user profile created for user: % (email: %)', NEW.id, NEW.email;
  ELSE
    RAISE LOG '[AUTH] ⏭️  Skipping regular user profile creation for user: % (is lawyer or profile exists)', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG '[AUTH] ❌ Error creating regular user profile for % (email: %): %', NEW.id, NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- 6. POBLAR user_type_registry CON DATOS EXISTENTES
-- ============================================
INSERT INTO public.user_type_registry (user_id, user_type)
SELECT id, 'lawyer' FROM public.lawyer_profiles
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_type_registry (user_id, user_type)
SELECT id, 'user' FROM public.user_profiles
ON CONFLICT (user_id) DO NOTHING;

-- 7. VERIFICACIÓN Y LOGGING
-- ============================================
DO $$
DECLARE
  lawyer_count INTEGER;
  user_count INTEGER;
  duplicate_count INTEGER;
BEGIN
  -- Contar perfiles
  SELECT COUNT(*) INTO lawyer_count FROM public.lawyer_profiles;
  SELECT COUNT(*) INTO user_count FROM public.user_profiles;
  
  -- Verificar duplicados (no deberían existir)
  SELECT COUNT(*) INTO duplicate_count
  FROM public.lawyer_profiles lp
  INNER JOIN public.user_profiles up ON lp.id = up.id;
  
  RAISE LOG '[AUTH] 📊 System Status:';
  RAISE LOG '[AUTH]    - Lawyer profiles: %', lawyer_count;
  RAISE LOG '[AUTH]    - User profiles: %', user_count;
  RAISE LOG '[AUTH]    - Duplicate profiles: % (should be 0)', duplicate_count;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING '[AUTH] ⚠️  Found % duplicate profiles! Manual cleanup required.', duplicate_count;
  END IF;
END $$;