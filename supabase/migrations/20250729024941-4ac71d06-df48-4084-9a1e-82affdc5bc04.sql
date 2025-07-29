-- Eliminar la policy conflictiva de lawyers que bloquea a los admins
DROP POLICY IF EXISTS "Lawyers can update their own profile" ON public.lawyer_profiles;

-- Recrear la policy de lawyers pero que no interfiera con los admins
CREATE POLICY "Lawyers can update their own profile" 
ON public.lawyer_profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));