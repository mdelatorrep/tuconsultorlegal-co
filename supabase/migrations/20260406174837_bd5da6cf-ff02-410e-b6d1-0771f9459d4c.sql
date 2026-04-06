CREATE POLICY "Admins can view all document tokens"
ON public.document_tokens
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));