-- Agregar política para que admins puedan actualizar lawyer_profiles
CREATE POLICY "Admins can update lawyer profiles" 
ON public.lawyer_profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));