-- Add INSERT, UPDATE, DELETE policies for admin users on utm_campaigns
CREATE POLICY "Admins can insert utm campaigns"
ON public.utm_campaigns
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = auth.uid() AND active = true
  )
);

CREATE POLICY "Admins can update utm campaigns"
ON public.utm_campaigns
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = auth.uid() AND active = true
  )
);

CREATE POLICY "Admins can delete utm campaigns"
ON public.utm_campaigns
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = auth.uid() AND active = true
  )
);