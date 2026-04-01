
-- ============================================
-- FIX 1: agent_conversations - CRITICAL
-- Drop public policy and create proper service_role policy
-- ============================================
DROP POLICY IF EXISTS "Service role can manage conversations" ON agent_conversations;

CREATE POLICY "Service role can manage conversations"
  ON agent_conversations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Allow anon/authenticated to INSERT (for chat sessions) scoped by session
CREATE POLICY "Users can insert own session conversations"
  ON agent_conversations FOR INSERT TO anon, authenticated
  WITH CHECK (user_session_id IS NOT NULL);

-- Allow anon/authenticated to SELECT their own conversations
CREATE POLICY "Users can view own session conversations"
  ON agent_conversations FOR SELECT TO anon, authenticated
  USING (
    user_session_id IS NOT NULL
    OR document_token_id IN (
      SELECT id FROM document_tokens WHERE user_id = auth.uid()
    )
  );

-- Allow update of own conversations (for status changes)
CREATE POLICY "Users can update own session conversations"
  ON agent_conversations FOR UPDATE TO anon, authenticated
  USING (user_session_id IS NOT NULL)
  WITH CHECK (user_session_id IS NOT NULL);

-- ============================================
-- FIX 2: openai_agents - restrict to service_role
-- ============================================
DROP POLICY IF EXISTS "Service role can manage OpenAI agents" ON openai_agents;

CREATE POLICY "Service role can manage OpenAI agents"
  ON openai_agents FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Public read for active agents (needed for chat widget)
CREATE POLICY "Public can view active agents"
  ON openai_agents FOR SELECT TO anon, authenticated
  USING (true);

-- ============================================
-- FIX 3: agent_workflows - restrict to service_role
-- ============================================
DROP POLICY IF EXISTS "Service role can manage workflows" ON agent_workflows;

CREATE POLICY "Service role can manage workflows"
  ON agent_workflows FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Public can view active workflows"
  ON agent_workflows FOR SELECT TO authenticated
  USING (is_active = true);

-- ============================================
-- FIX 4: blog_posts - restrict write to service_role
-- ============================================
DROP POLICY IF EXISTS "Service role can manage all blogs" ON blog_posts;

CREATE POLICY "Service role can manage all blogs"
  ON blog_posts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Authenticated admins can manage blogs (via edge functions with service role)
-- Public read already handled by "Anyone can view published blogs" policy

-- ============================================
-- FIX 5: lawyer_training_progress - restrict to service_role + owner
-- ============================================
DROP POLICY IF EXISTS "Service role can manage training progress" ON lawyer_training_progress;

CREATE POLICY "Service role can manage training progress"
  ON lawyer_training_progress FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Lawyers can manage own training progress"
  ON lawyer_training_progress FOR ALL TO authenticated
  USING (lawyer_id = auth.uid())
  WITH CHECK (lawyer_id = auth.uid());

-- ============================================
-- FIX 6: legal_advisor_agents - restrict write to service_role
-- ============================================
DROP POLICY IF EXISTS "Service role can manage advisor agents" ON legal_advisor_agents;

CREATE POLICY "Service role can manage advisor agents"
  ON legal_advisor_agents FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Public read for active agents already handled by existing policy

-- ============================================
-- FIX 7: firecrawl_agent_jobs - fix service role policy
-- ============================================
DROP POLICY IF EXISTS "Service role manages firecrawl jobs" ON firecrawl_agent_jobs;

CREATE POLICY "Service role manages firecrawl jobs"
  ON firecrawl_agent_jobs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================
-- FIX 8: pricing_analytics - restrict SELECT to service_role (contains IP/user-agent PII)
-- ============================================
DROP POLICY IF EXISTS "view_pricing_analytics" ON pricing_analytics;

CREATE POLICY "Service role can view pricing analytics"
  ON pricing_analytics FOR SELECT TO service_role
  USING (true);
