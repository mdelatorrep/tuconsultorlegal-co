-- Política RLS para permitir a usuarios actualizar observaciones en sus propios documentos
CREATE POLICY "Users can update observations on their own documents"
ON public.document_tokens
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  AND status IN ('revision_usuario', 'en_revision_abogado')
)
WITH CHECK (
  auth.uid() = user_id 
  AND status IN ('revision_usuario', 'en_revision_abogado')
);