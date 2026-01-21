-- Update document 7C6496CD2E60 to be ready for payment
UPDATE document_tokens 
SET status = 'revision_usuario', updated_at = NOW()
WHERE token = '7C6496CD2E60';