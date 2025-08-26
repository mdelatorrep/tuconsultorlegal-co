-- Create policy to allow authenticated lawyer profiles to update document content
CREATE POLICY "Authenticated lawyer profiles can update document content" 
ON public.document_tokens 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM public.lawyer_profiles lp 
    WHERE lp.id = auth.uid() 
    AND lp.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.lawyer_profiles lp 
    WHERE lp.id = auth.uid() 
    AND lp.is_active = true
  )
);