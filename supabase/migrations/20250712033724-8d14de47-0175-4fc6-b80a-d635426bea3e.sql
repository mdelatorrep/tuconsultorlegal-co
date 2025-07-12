-- Actualizar la política RLS para admin_profiles para que funcione con Supabase Auth nativo
DROP POLICY IF EXISTS "Admins can view their own profile" ON public.admin_profiles;

-- Crear nueva política que permita a los usuarios autenticados ver perfiles admin que coincidan con su user_id
CREATE POLICY "Admin users can view their profile"
ON public.admin_profiles
FOR ALL
USING (auth.uid() = user_id);

-- Crear política adicional para permitir consultas desde funciones autenticadas
CREATE POLICY "Service role can access admin profiles"
ON public.admin_profiles
FOR ALL
USING (true)
WITH CHECK (true);