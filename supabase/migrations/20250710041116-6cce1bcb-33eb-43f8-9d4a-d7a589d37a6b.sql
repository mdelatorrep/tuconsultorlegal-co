-- Crear políticas correctas para las tablas administrativas
-- Solo administradores (de admin_accounts) pueden ver logs y eventos de seguridad

-- Crear función para verificar si el usuario actual es un admin real
CREATE OR REPLACE FUNCTION public.is_current_user_system_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Verificar si existe un admin activo con el auth.uid() actual
  RETURN EXISTS (
    SELECT 1 FROM public.admin_accounts 
    WHERE id = auth.uid() 
    AND active = true
  );
END;
$$;

-- Políticas para webhook_logs - solo admins del sistema
CREATE POLICY "System admins can view webhook logs" 
ON public.webhook_logs 
FOR SELECT 
USING (public.is_current_user_system_admin());

-- Políticas para security_events - solo admins del sistema  
CREATE POLICY "System admins can view security events" 
ON public.security_events 
FOR SELECT 
USING (public.is_current_user_system_admin());

-- Políticas para lawyer_accounts - abogados solo ven su propia cuenta
DROP POLICY IF EXISTS "Lawyers can view their own account" ON public.lawyer_accounts;

CREATE POLICY "Lawyers can view their own account only" 
ON public.lawyer_accounts 
FOR SELECT 
USING (auth.uid()::text = id::text);

CREATE POLICY "Lawyers can update their own account only" 
ON public.lawyer_accounts 
FOR UPDATE 
USING (auth.uid()::text = id::text);

-- Comentarios para clarificar
COMMENT ON TABLE public.lawyer_accounts IS 'Tabla para abogados que usan la plataforma - NO son administradores del sistema';
COMMENT ON TABLE public.admin_accounts IS 'Tabla para administradores del sistema - NO son abogados';