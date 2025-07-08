-- Actualizar las políticas RLS para legal_agents para que funcionen con el sistema de autenticación de abogados personalizado

-- Eliminar las políticas actuales que no funcionan
DROP POLICY IF EXISTS "Authenticated lawyers can create agents" ON public.legal_agents;
DROP POLICY IF EXISTS "Lawyers can update their own agents" ON public.legal_agents;
DROP POLICY IF EXISTS "Lawyers can view their own agents" ON public.legal_agents;

-- Crear política para inserción que funcione con el sistema de tokens de abogados
CREATE POLICY "Lawyers can create agents with token auth"
ON public.legal_agents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.lawyer_accounts 
    WHERE lawyer_accounts.id = legal_agents.created_by 
    AND lawyer_accounts.active = true 
    AND lawyer_accounts.can_create_agents = true
    AND lawyer_accounts.access_token = ((current_setting('request.headers', true))::json ->> 'authorization')
  )
);

-- Crear política para actualización
CREATE POLICY "Lawyers can update their own agents with token auth"
ON public.legal_agents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM public.lawyer_accounts 
    WHERE lawyer_accounts.id = legal_agents.created_by 
    AND lawyer_accounts.access_token = ((current_setting('request.headers', true))::json ->> 'authorization')
    AND lawyer_accounts.active = true
  )
);

-- Crear política para consulta (visualización)
CREATE POLICY "Lawyers can view their own agents with token auth"
ON public.legal_agents
FOR SELECT
USING (
  created_by IN (
    SELECT lawyer_accounts.id
    FROM public.lawyer_accounts
    WHERE lawyer_accounts.access_token = ((current_setting('request.headers', true))::json ->> 'authorization')
    AND lawyer_accounts.active = true
  )
);