-- Eliminar políticas que dependen del campo is_admin en lawyer_accounts
DROP POLICY IF EXISTS "Admin only webhook logs access" ON public.webhook_logs;
DROP POLICY IF EXISTS "Admin only security events access" ON public.security_events;

-- Ahora eliminar el campo is_admin de lawyer_accounts
ALTER TABLE public.lawyer_accounts 
DROP COLUMN IF EXISTS is_admin;