-- Crear tabla de admin_users usando el sistema nativo de Supabase Auth
-- Esto será completamente independiente del sistema de lawyers

-- 1. Crear tabla de perfiles de admin que conecta con auth.users
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  is_super_admin BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS para admin_profiles
CREATE POLICY "Admins can view their own profile" 
ON public.admin_profiles 
FOR ALL 
USING (auth.uid() = user_id);

-- 4. Función para verificar si el usuario actual es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
    AND active = true
  );
$$;

-- 5. Función para verificar si es super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
    AND active = true 
    AND is_super_admin = true
  );
$$;

-- 6. Trigger para actualizar timestamp
CREATE TRIGGER update_admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Insertar el admin existente en el nuevo sistema
-- Primero crear el usuario en auth.users (esto se hace desde el frontend)
-- Luego asociar con admin_profiles