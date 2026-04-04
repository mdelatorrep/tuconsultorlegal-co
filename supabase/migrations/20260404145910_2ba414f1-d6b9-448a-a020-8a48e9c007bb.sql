-- Allow public read access to lawyer_profiles for lawyers with published public profiles
CREATE POLICY "Public can view lawyers with published profiles"
ON public.lawyer_profiles
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lawyer_public_profiles lpp
    WHERE lpp.lawyer_id = lawyer_profiles.id
    AND lpp.is_published = true
  )
);