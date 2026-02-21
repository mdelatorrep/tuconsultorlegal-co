-- Allow all authenticated users to read system_config
CREATE POLICY "Authenticated users can read system config"
ON public.system_config
FOR SELECT
TO authenticated
USING (true);