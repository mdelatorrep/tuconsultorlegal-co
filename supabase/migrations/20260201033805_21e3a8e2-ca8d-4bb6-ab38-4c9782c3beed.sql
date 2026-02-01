-- Fix: Remove overly permissive SELECT policies that expose customer PII
-- when user_id IS NULL, which allows unauthenticated access to documents

-- Step 1: Drop the problematic SELECT policies that allow NULL user_id access
DROP POLICY IF EXISTS "Users can access their own document tokens" ON document_tokens;
DROP POLICY IF EXISTS "Users can view their own document tokens" ON document_tokens;

-- Step 2: Create properly scoped SELECT policies

-- Policy 1: Authenticated users can ONLY see their OWN documents (by user_id)
CREATE POLICY "Users can view their own documents by user_id"
  ON document_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Authenticated users can see documents matching their email
-- (for legacy documents or documents created before login)
CREATE POLICY "Users can view documents by matching email"
  ON document_tokens
  FOR SELECT
  USING (
    user_email IS NOT NULL AND
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy 3: Lawyers can view documents they are reviewing
CREATE POLICY "Lawyers can view assigned documents"
  ON document_tokens
  FOR SELECT
  USING (reviewed_by_lawyer_id = auth.uid());

-- Policy 4: Lawyers can view documents for agents they created
CREATE POLICY "Lawyers can view documents from their agents"
  ON document_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM legal_agents la
      WHERE la.id = document_tokens.legal_agent_id
      AND la.created_by = auth.uid()
    )
  );

-- Step 3: Fix INSERT policy - require authenticated user or service role
DROP POLICY IF EXISTS "Users can create document tokens" ON document_tokens;

CREATE POLICY "Authenticated users can create document tokens"
  ON document_tokens
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid() = user_id OR user_id IS NULL)
  );

-- Step 4: Fix UPDATE policy that allows anyone to update observations without auth
DROP POLICY IF EXISTS "Users can update observations using document token" ON document_tokens;

CREATE POLICY "Authenticated users can update their document observations"
  ON document_tokens
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    (auth.uid() = user_id OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())) AND
    status IN ('revision_usuario', 'en_revision_abogado')
  )
  WITH CHECK (
    status = 'en_revision_abogado'
  );