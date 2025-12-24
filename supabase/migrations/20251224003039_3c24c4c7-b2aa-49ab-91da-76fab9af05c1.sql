-- Add RLS policy to allow admins to view all lawyer profiles
CREATE POLICY "Admins can view all lawyer profiles"
ON public.lawyer_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE admin_profiles.user_id = auth.uid()
    AND admin_profiles.active = true
  )
);

-- Also allow service role to manage lawyer profiles (for edge functions)
CREATE POLICY "Service role can manage lawyer profiles"
ON public.lawyer_profiles
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');