-- ============================================
-- Sistema de Notificaciones por Email
-- ============================================

-- 1. Tabla de configuración SMTP
CREATE TABLE IF NOT EXISTS public.email_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host TEXT NOT NULL DEFAULT 'smtpout.secureserver.net',
  smtp_port INTEGER NOT NULL DEFAULT 465,
  smtp_secure BOOLEAN NOT NULL DEFAULT true,
  smtp_user TEXT NOT NULL DEFAULT 'contacto@tuconsultorlegal.co',
  smtp_from_name TEXT NOT NULL DEFAULT 'Tu Consultor Legal',
  smtp_from_email TEXT NOT NULL DEFAULT 'contacto@tuconsultorlegal.co',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para email_configuration
ALTER TABLE public.email_configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email config"
  ON public.email_configuration FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() AND active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() AND active = true
  ));

CREATE POLICY "Service role can manage email config"
  ON public.email_configuration FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- 2. Tabla de plantillas de email
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para búsqueda rápida
CREATE INDEX idx_email_templates_key ON public.email_templates(template_key);

-- RLS para email_templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates"
  ON public.email_templates FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() AND active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() AND active = true
  ));

CREATE POLICY "Service role can manage email templates"
  ON public.email_templates FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Anyone can view active templates"
  ON public.email_templates FOR SELECT
  USING (is_active = true);

-- 3. Tabla de log de notificaciones
CREATE TABLE IF NOT EXISTS public.email_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_token_id UUID REFERENCES public.document_tokens(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  template_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para reporting
CREATE INDEX idx_email_log_status ON public.email_notifications_log(status);
CREATE INDEX idx_email_log_document ON public.email_notifications_log(document_token_id);
CREATE INDEX idx_email_log_created ON public.email_notifications_log(created_at DESC);
CREATE INDEX idx_email_log_recipient ON public.email_notifications_log(recipient_email);

-- RLS para email_notifications_log
ALTER TABLE public.email_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs"
  ON public.email_notifications_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() AND active = true
  ));

CREATE POLICY "Service role can manage logs"
  ON public.email_notifications_log FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- 4. Insertar configuración inicial
INSERT INTO public.email_configuration (
  smtp_host, smtp_port, smtp_secure, smtp_user, smtp_from_name, smtp_from_email, is_active
) VALUES (
  'smtpout.secureserver.net', 465, true, 'contacto@tuconsultorlegal.co', 'Tu Consultor Legal', 'contacto@tuconsultorlegal.co', true
);

-- 5. Insertar plantillas iniciales
INSERT INTO public.email_templates (template_key, template_name, subject, html_body, variables, is_active) VALUES
(
  'document_requested',
  'Documento Solicitado',
  'Nuevo documento solicitado: {{document_type}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; color: #333; }
    .button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    .info-box { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .info-box strong { color: #667eea; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Nuevo Documento Solicitado</h1>
    </div>
    <div class="content">
      <p>Hola,</p>
      <p>Se ha solicitado un nuevo documento en la plataforma:</p>
      <div class="info-box">
        <p><strong>Tipo de documento:</strong> {{document_type}}</p>
        <p><strong>Cliente:</strong> {{user_name}} ({{user_email}})</p>
        <p><strong>Código de seguimiento:</strong> {{tracking_code}}</p>
        <p><strong>Fecha de solicitud:</strong> {{created_at}}</p>
      </div>
      <p>Por favor, revisa el documento y comienza con el proceso de elaboración.</p>
      <a href="{{dashboard_url}}" class="button">Ver en Dashboard</a>
    </div>
    <div class="footer">
      <p>© 2025 Tu Consultor Legal. Todos los derechos reservados.</p>
      <p>Este es un correo automático, por favor no responder.</p>
    </div>
  </div>
</body>
</html>',
  '["document_type", "user_name", "user_email", "tracking_code", "created_at", "dashboard_url"]'::jsonb,
  true
),
(
  'document_in_review',
  'Documento en Revisión',
  'Tu documento {{document_type}} está siendo revisado',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; color: #333; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    .status-badge { background: #ffc107; color: #000; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 Documento en Revisión</h1>
    </div>
    <div class="content">
      <p>Hola {{user_name}},</p>
      <p>Queremos informarte que tu documento <strong>{{document_type}}</strong> está siendo revisado por nuestro equipo legal.</p>
      <div class="status-badge">⏳ En proceso de revisión</div>
      <p><strong>Código de seguimiento:</strong> {{tracking_code}}</p>
      <p>Te notificaremos cuando el documento esté listo para tu revisión y pago.</p>
    </div>
    <div class="footer">
      <p>© 2025 Tu Consultor Legal. Todos los derechos reservados.</p>
      <p>Este es un correo automático, por favor no responder.</p>
    </div>
  </div>
</body>
</html>',
  '["user_name", "document_type", "tracking_code"]'::jsonb,
  true
),
(
  'document_ready_for_review',
  'Documento Listo para Revisión',
  '¡Tu documento {{document_type}} está listo!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; color: #333; }
    .button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    .price-box { background: #e8f5e9; padding: 20px; border-radius: 6px; margin: 15px 0; text-align: center; }
    .price { font-size: 32px; font-weight: bold; color: #2e7d32; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ ¡Tu Documento está Listo!</h1>
    </div>
    <div class="content">
      <p>Hola {{user_name}},</p>
      <p>¡Buenas noticias! Tu documento <strong>{{document_type}}</strong> ha sido elaborado y está listo para tu revisión.</p>
      <p><strong>Código de seguimiento:</strong> {{tracking_code}}</p>
      <div class="price-box">
        <p style="margin: 0; color: #666;">Precio del documento:</p>
        <div class="price">${{price}} COP</div>
      </div>
      <p>Puedes revisar el documento y proceder con el pago para descargarlo.</p>
      <a href="{{tracking_url}}" class="button">Ver Documento y Pagar</a>
    </div>
    <div class="footer">
      <p>© 2025 Tu Consultor Legal. Todos los derechos reservados.</p>
      <p>Este es un correo automático, por favor no responder.</p>
    </div>
  </div>
</body>
</html>',
  '["user_name", "document_type", "tracking_code", "price", "tracking_url"]'::jsonb,
  true
),
(
  'document_paid',
  'Documento Pagado',
  'Pago recibido por documento {{document_type}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; color: #333; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    .info-box { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .info-box strong { color: #4caf50; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💳 Pago Recibido</h1>
    </div>
    <div class="content">
      <p>Hola,</p>
      <p>El cliente <strong>{{user_name}}</strong> ha completado el pago de su documento:</p>
      <div class="info-box">
        <p><strong>Tipo de documento:</strong> {{document_type}}</p>
        <p><strong>Código de seguimiento:</strong> {{tracking_code}}</p>
        <p><strong>Monto pagado:</strong> ${{price}} COP</p>
        <p><strong>Email del cliente:</strong> {{user_email}}</p>
      </div>
      <p>El documento ya está disponible para que el cliente lo descargue.</p>
    </div>
    <div class="footer">
      <p>© 2025 Tu Consultor Legal. Todos los derechos reservados.</p>
      <p>Este es un correo automático, por favor no responder.</p>
    </div>
  </div>
</body>
</html>',
  '["user_name", "document_type", "tracking_code", "price", "user_email"]'::jsonb,
  true
),
(
  'document_downloaded',
  'Documento Descargado',
  'Cliente descargó documento {{document_type}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; color: #333; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📥 Documento Descargado</h1>
    </div>
    <div class="content">
      <p>Hola,</p>
      <p>El cliente <strong>{{user_name}}</strong> ({{user_email}}) ha descargado el documento <strong>{{document_type}}</strong>.</p>
      <p><strong>Código de seguimiento:</strong> {{tracking_code}}</p>
      <p>El proceso ha sido completado exitosamente.</p>
    </div>
    <div class="footer">
      <p>© 2025 Tu Consultor Legal. Todos los derechos reservados.</p>
      <p>Este es un correo automático, por favor no responder.</p>
    </div>
  </div>
</body>
</html>',
  '["user_name", "user_email", "document_type", "tracking_code"]'::jsonb,
  true
),
(
  'lawyer_new_assignment',
  'Nuevo Documento Asignado',
  'Documento asignado: {{document_type}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; color: #333; }
    .button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Nuevo Documento Asignado</h1>
    </div>
    <div class="content">
      <p>Hola {{lawyer_name}},</p>
      <p>Se te ha asignado un nuevo documento para revisar:</p>
      <p><strong>Tipo:</strong> {{document_type}}</p>
      <p><strong>Cliente:</strong> {{user_name}}</p>
      <p><strong>Código:</strong> {{tracking_code}}</p>
      <p><strong>SLA:</strong> {{sla_hours}} horas</p>
      <a href="{{dashboard_url}}" class="button">Ver en Dashboard</a>
    </div>
    <div class="footer">
      <p>© 2025 Tu Consultor Legal. Todos los derechos reservados.</p>
      <p>Este es un correo automático, por favor no responder.</p>
    </div>
  </div>
</body>
</html>',
  '["lawyer_name", "document_type", "user_name", "tracking_code", "sla_hours", "dashboard_url"]'::jsonb,
  true
);

-- 6. Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Triggers para updated_at
CREATE TRIGGER update_email_configuration_updated_at
  BEFORE UPDATE ON public.email_configuration
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_updated_at();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_updated_at();