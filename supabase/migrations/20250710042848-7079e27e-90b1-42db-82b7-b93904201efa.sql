-- Separar completamente los sistemas de autenticación de admins y lawyers

-- 1. Eliminar campo is_admin de lawyer_accounts (ya no lo necesitamos)
ALTER TABLE public.lawyer_accounts DROP COLUMN IF EXISTS is_admin;

-- 2. Agregar campo session_token a admin_accounts para sesiones
ALTER TABLE public.admin_accounts ADD COLUMN IF NOT EXISTS session_token TEXT;
ALTER TABLE public.admin_accounts ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;

-- 3. Crear función para verificar si el usuario actual es admin usando session token
CREATE OR REPLACE FUNCTION public.is_current_user_admin_by_session()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  session_token TEXT;
  admin_exists BOOLEAN := false;
BEGIN
  -- Obtener token de los headers
  session_token := current_setting('request.headers', true)::json->>'authorization';
  
  IF session_token IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar si existe un admin activo con este token
  SELECT EXISTS (
    SELECT 1 FROM public.admin_accounts 
    WHERE session_token = session_token
    AND active = true 
    AND (token_expires_at IS NULL OR token_expires_at > now())
  ) INTO admin_exists;
  
  RETURN admin_exists;
END;
$$;

-- 4. Actualizar políticas RLS para usar la nueva función de admin
DROP POLICY IF EXISTS "Admin access to legal agents" ON public.legal_agents;
CREATE POLICY "Admin access to legal agents" 
ON public.legal_agents 
FOR ALL 
USING (public.is_current_user_admin_by_session());

-- 5. Política separada para lawyers
DROP POLICY IF EXISTS "Lawyers can view their own agents with token auth" ON public.legal_agents;
CREATE POLICY "Lawyers can view their own agents with token auth" 
ON public.legal_agents 
FOR SELECT 
USING (created_by IN ( 
  SELECT lawyer_accounts.id
  FROM lawyer_accounts
  WHERE lawyer_accounts.access_token = ((current_setting('request.headers', true))::json ->> 'authorization')
  AND lawyer_accounts.active = true
));

-- 6. Comentarios para clarificar la separación
COMMENT ON TABLE public.admin_accounts IS 'Tabla exclusiva para administradores del sistema con autenticación por session_token';
COMMENT ON TABLE public.lawyer_accounts IS 'Tabla exclusiva para abogados con autenticación por access_token';
COMMENT ON FUNCTION public.is_current_user_admin_by_session() IS 'Verifica si el token actual pertenece a un administrador activo';