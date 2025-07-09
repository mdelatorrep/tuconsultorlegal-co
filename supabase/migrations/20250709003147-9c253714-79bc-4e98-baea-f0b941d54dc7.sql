-- Borrar todos los document_tokens
DELETE FROM public.document_tokens;

-- Borrar todos los legal_agents
DELETE FROM public.legal_agents;

-- Borrar todos los lawyer_accounts excepto el super admin manuel@tuconsultorlegal.co
DELETE FROM public.lawyer_accounts 
WHERE email != 'manuel@tuconsultorlegal.co';

-- Borrar todos los webhook_logs (si existen)
DELETE FROM public.webhook_logs;

-- Borrar todos los security_events (si existen)
DELETE FROM public.security_events;

-- Borrar todos los auth_rate_limits (para limpiar intentos de login)
DELETE FROM public.auth_rate_limits;