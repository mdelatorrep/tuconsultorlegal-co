-- Add RLS policy to allow users to delete their own documents
-- Only allow deletion of documents in certain statuses (not paid or completed)
CREATE POLICY "Users can delete their own pending documents"
ON document_tokens
FOR DELETE
USING (
  auth.uid() = user_id 
  AND status IN ('solicitado', 'en_revision_abogado')
);

COMMENT ON POLICY "Users can delete their own pending documents" ON document_tokens IS
'Allows users to delete their own documents that are still pending or in lawyer review. Cannot delete paid or completed documents.';