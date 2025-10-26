-- Drop existing delete policy
DROP POLICY IF EXISTS "Users can delete their own pending documents" ON public.document_tokens;

-- Create new delete policy that allows deletion by user_id OR user_email
CREATE POLICY "Users can delete their own pending documents" 
ON public.document_tokens 
FOR DELETE 
USING (
  (status = ANY (ARRAY['solicitado'::document_status, 'en_revision_abogado'::document_status]))
  AND (
    (auth.uid() = user_id) 
    OR 
    (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);