-- Eliminar todas las políticas UPDATE existentes para lawyer_profiles
DROP POLICY IF EXISTS "Admins can update lawyer profiles" ON public.lawyer_profiles;
DROP POLICY IF EXISTS "Lawyers can update their own profile" ON public.lawyer_profiles;

-- Crear una sola política UPDATE más simple y directa
CREATE POLICY "Allow authorized updates on lawyer profiles" 
ON public.lawyer_profiles 
FOR UPDATE 
TO authenticated
USING (
  -- Permitir si es admin/super_admin O si es el dueño del perfil
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role) 
  OR auth.uid() = id
)
WITH CHECK (
  -- Misma condición para WITH CHECK
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role) 
  OR auth.uid() = id
);