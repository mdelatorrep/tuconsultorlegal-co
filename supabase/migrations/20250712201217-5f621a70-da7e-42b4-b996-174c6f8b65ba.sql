-- Eliminar todas las tablas de autenticación y datos relacionados
DROP TABLE IF EXISTS public.admin_accounts CASCADE;
DROP TABLE IF EXISTS public.admin_profiles CASCADE;
DROP TABLE IF EXISTS public.lawyer_accounts CASCADE;
DROP TABLE IF EXISTS public.lawyer_tokens CASCADE;
DROP TABLE IF EXISTS public.lawyer_token_requests CASCADE;
DROP TABLE IF EXISTS public.auth_rate_limits CASCADE;
DROP TABLE IF EXISTS public.security_events CASCADE;
DROP TABLE IF EXISTS public.webhook_logs CASCADE;

-- Eliminar funciones de autenticación
DROP FUNCTION IF EXISTS public.is_current_admin() CASCADE;
DROP FUNCTION IF EXISTS public.verify_admin_token(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.auto_cleanup_admin_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.log_security_event(text, uuid, inet, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.is_current_user_admin() CASCADE;
DROP FUNCTION IF EXISTS public.hash_admin_token(text) CASCADE;
DROP FUNCTION IF EXISTS public.hash_password(text) CASCADE;
DROP FUNCTION IF EXISTS public.verify_password(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.verify_admin_password(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.check_rate_limit(text, text, integer, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.reset_rate_limit(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_user(text) CASCADE;
DROP FUNCTION IF EXISTS public.is_valid_lawyer_token(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_lawyer_by_token(text) CASCADE;
DROP FUNCTION IF EXISTS public.hash_password_on_insert() CASCADE;
DROP FUNCTION IF EXISTS public.is_current_user_system_admin() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_admin_user() CASCADE;
DROP FUNCTION IF EXISTS public.log_admin_action(text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.generate_secure_lawyer_token() CASCADE;
DROP FUNCTION IF EXISTS public.is_valid_email(text) CASCADE;

-- Actualizar tabla legal_agents para remover referencias a autenticación
ALTER TABLE public.legal_agents DROP CONSTRAINT IF EXISTS fk_price_approved_by;
ALTER TABLE public.legal_agents DROP CONSTRAINT IF EXISTS legal_agents_created_by_fkey;

-- Simplificar legal_agents - mantener solo campos básicos
ALTER TABLE public.legal_agents 
DROP COLUMN IF EXISTS created_by,
DROP COLUMN IF EXISTS price_approved_by,
DROP COLUMN IF EXISTS price_approved_at;

-- Hacer que todos los agentes sean visibles sin autenticación
DROP POLICY IF EXISTS "Admin access to legal agents via profiles" ON public.legal_agents;
DROP POLICY IF EXISTS "Anyone can view active agents" ON public.legal_agents;
DROP POLICY IF EXISTS "Lawyers can create agents with token auth" ON public.legal_agents;
DROP POLICY IF EXISTS "Lawyers can update their own agents with token auth" ON public.legal_agents;
DROP POLICY IF EXISTS "Lawyers can view their own agents with token auth" ON public.legal_agents;

-- Crear política simple para acceso público
CREATE POLICY "Public access to legal agents" ON public.legal_agents FOR ALL USING (true) WITH CHECK (true);

-- Actualizar document_tokens para acceso más simple
DROP POLICY IF EXISTS "Secure document status updates" ON public.document_tokens;
DROP POLICY IF EXISTS "Secure document token access" ON public.document_tokens;

-- Política simple para document_tokens
CREATE POLICY "Public access to document tokens" ON public.document_tokens FOR ALL USING (true) WITH CHECK (true);