-- Fix document_tokens RLS policy to prevent all users from accessing all documents
-- This is a CRITICAL security fix
DROP POLICY IF EXISTS "Users can access their own document tokens" ON public.document_tokens;

CREATE POLICY "Users can access their own document tokens"
ON public.document_tokens
FOR SELECT
USING ((auth.uid() = user_id) OR (user_id IS NULL));