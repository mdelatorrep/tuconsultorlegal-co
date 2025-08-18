-- CRITICAL SECURITY FIXES - Phase 1: RLS Policy Hardening

-- 1. Secure admin_accounts table - Remove public access, restrict to authenticated admins only
DROP POLICY IF EXISTS "Service role can manage admin accounts" ON public.admin_accounts;

CREATE POLICY "Authenticated admins can view admin accounts" 
ON public.admin_accounts 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
    AND active = true
  )
);

CREATE POLICY "Super admins can manage admin accounts" 
ON public.admin_accounts 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
    AND is_super_admin = true 
    AND active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
    AND is_super_admin = true 
    AND active = true
  )
);

CREATE POLICY "Service role can manage admin accounts" 
ON public.admin_accounts 
FOR ALL 
USING (auth.role() = 'service_role');

-- 2. Secure contact_messages table - Allow public INSERT, restrict viewing to admins
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Service role can manage all contact messages" ON public.contact_messages;

CREATE POLICY "Anyone can submit contact messages" 
ON public.contact_messages 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated admins can view contact messages" 
ON public.contact_messages 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
    AND active = true
  )
);

CREATE POLICY "Authenticated admins can update contact messages" 
ON public.contact_messages 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
    AND active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
    AND active = true
  )
);

CREATE POLICY "Service role can manage contact messages" 
ON public.contact_messages 
FOR ALL 
USING (auth.role() = 'service_role');

-- 3. Secure system_config table - Restrict to admins and service role only
DROP POLICY IF EXISTS "Service role can manage system config" ON public.system_config;

CREATE POLICY "Super admins can manage system config" 
ON public.system_config 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
    AND is_super_admin = true 
    AND active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
    AND is_super_admin = true 
    AND active = true
  )
);

CREATE POLICY "Service role can manage system config" 
ON public.system_config 
FOR ALL 
USING (auth.role() = 'service_role');

-- 4. Secure knowledge_base_urls - Restrict to authenticated users and admins
DROP POLICY IF EXISTS "Service role can manage knowledge base URLs" ON public.knowledge_base_urls;

CREATE POLICY "Authenticated users can view active knowledge base URLs" 
ON public.knowledge_base_urls 
FOR SELECT 
TO authenticated
USING (is_active = true);

CREATE POLICY "Authenticated admins can manage knowledge base URLs" 
ON public.knowledge_base_urls 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
    AND active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
    AND active = true
  )
);

CREATE POLICY "Service role can manage knowledge base URLs" 
ON public.knowledge_base_urls 
FOR ALL 
USING (auth.role() = 'service_role');

-- 5. Enhance security audit logging
CREATE POLICY "Service role can manage audit logs" 
ON public.security_audit_log 
FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Super admins can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
    AND is_super_admin = true 
    AND active = true
  )
);

-- 6. Log this security update
SELECT log_security_event(
  'rls_policies_hardened',
  'system',
  jsonb_build_object(
    'tables_secured', ARRAY['admin_accounts', 'contact_messages', 'system_config', 'knowledge_base_urls'],
    'security_level', 'critical',
    'phase', 'phase_1_rls_hardening'
  )
);