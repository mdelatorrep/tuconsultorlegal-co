-- Recrear la política para permitir inserciones anónimas en crm_leads
DROP POLICY IF EXISTS "Anyone can create leads" ON public.crm_leads;

-- Crear una política permisiva que permita a cualquiera (incluso usuarios no autenticados) crear leads
CREATE POLICY "Anyone can create leads"
ON public.crm_leads
FOR INSERT
TO public
WITH CHECK (true);