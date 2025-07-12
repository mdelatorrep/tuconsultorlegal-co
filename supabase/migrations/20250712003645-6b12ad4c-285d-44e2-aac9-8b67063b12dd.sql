-- Desbloquear la cuenta admin y resetear intentos fallidos
UPDATE public.admin_accounts 
SET failed_login_attempts = 0, 
    locked_until = NULL 
WHERE email = 'manuel@tuconsultorlegal.co';

-- Crear índices para mejorar rendimiento de autenticación de admins
CREATE INDEX IF NOT EXISTS idx_admin_accounts_email ON public.admin_accounts(email) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_admin_accounts_session_token ON public.admin_accounts(session_token) WHERE session_token IS NOT NULL;

-- Crear función para validar sesión de admin (independiente de lawyers)
CREATE OR REPLACE FUNCTION public.validate_admin_session(session_token TEXT)
RETURNS TABLE(valid BOOLEAN, user_id UUID, expires_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN a.id IS NOT NULL AND a.active = true AND (a.token_expires_at IS NULL OR a.token_expires_at > now()) 
      THEN true 
      ELSE false 
    END as valid,
    a.id as user_id,
    a.token_expires_at as expires_at
  FROM public.admin_accounts a
  WHERE a.session_token = validate_admin_session.session_token
    AND a.active = true;
END;
$$;

-- Función para limpiar sesiones expiradas de admin
CREATE OR REPLACE FUNCTION public.cleanup_expired_admin_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE public.admin_accounts 
  SET session_token = NULL, 
      token_expires_at = NULL
  WHERE token_expires_at < now() 
    AND session_token IS NOT NULL;
    
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN cleaned_count;
END;
$$;

-- Crear trigger para limpiar automáticamente sesiones expiradas
CREATE OR REPLACE FUNCTION public.auto_cleanup_admin_sessions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ejecutar limpieza cada vez que se actualiza una cuenta admin
  PERFORM public.cleanup_expired_admin_sessions();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cleanup_admin_sessions ON public.admin_accounts;
CREATE TRIGGER trigger_cleanup_admin_sessions
  AFTER UPDATE ON public.admin_accounts
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.auto_cleanup_admin_sessions();