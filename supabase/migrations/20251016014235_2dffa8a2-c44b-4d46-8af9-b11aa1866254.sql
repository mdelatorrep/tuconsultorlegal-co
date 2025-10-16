-- ============================================
-- Sistema de Notificaciones por Email (Fixed)
-- ============================================

-- 1. Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage email config" ON public.email_configuration;
DROP POLICY IF EXISTS "Service role can manage email config" ON public.email_configuration;
DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Service role can manage email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Anyone can view active templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can view all logs" ON public.email_notifications_log;
DROP POLICY IF EXISTS "Service role can manage logs" ON public.email_notifications_log;

-- 2. Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_email_configuration_updated_at ON public.email_configuration;
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON public.email_templates;

-- 3. Tabla de configuración SMTP
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

-- 4. Tabla de plantillas de email
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

CREATE INDEX IF NOT EXISTS idx_email_templates_key ON public.email_templates(template_key);

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

-- 5. Tabla de log de notificaciones
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

CREATE INDEX IF NOT EXISTS idx_email_log_status ON public.email_notifications_log(status);
CREATE INDEX IF NOT EXISTS idx_email_log_document ON public.email_notifications_log(document_token_id);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON public.email_notifications_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON public.email_notifications_log(recipient_email);

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

-- 6. Insertar configuración inicial solo si no existe
INSERT INTO public.email_configuration (
  smtp_host, smtp_port, smtp_secure, smtp_user, smtp_from_name, smtp_from_email, is_active
)
SELECT 
  'smtpout.secureserver.net', 465, true, 'contacto@tuconsultorlegal.co', 'Tu Consultor Legal', 'contacto@tuconsultorlegal.co', true
WHERE NOT EXISTS (SELECT 1 FROM public.email_configuration LIMIT 1);

-- 7. Insertar plantillas solo si no existen
INSERT INTO public.email_templates (template_key, template_name, subject, html_body, variables, is_active)
SELECT * FROM (VALUES
  ('document_requested', 'Documento Solicitado', 'Nuevo documento solicitado: {{document_type}}',
   E'<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <style>\n    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }\n    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }\n    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }\n    .content { padding: 30px; color: #333; }\n    .button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px; }\n    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }\n    .info-box { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }\n    .info-box strong { color: #667eea; }\n  </style>\n</head>\n<body>\n  <div class="container">\n    <div class="header">\n      <h1>📄 Nuevo Documento Solicitado</h1>\n    </div>\n    <div class="content">\n      <p>Hola,</p>\n      <p>Se ha solicitado un nuevo documento en la plataforma:</p>\n      <div class="info-box">\n        <p><strong>Tipo de documento:</strong> {{document_type}}</p>\n        <p><strong>Cliente:</strong> {{user_name}} ({{user_email}})</p>\n        <p><strong>Código de seguimiento:</strong> {{tracking_code}}</p>\n        <p><strong>Fecha de solicitud:</strong> {{created_at}}</p>\n      </div>\n      <p>Por favor, revisa el documento y comienza con el proceso de elaboración.</p>\n      <a href="{{dashboard_url}}" class="button">Ver en Dashboard</a>\n    </div>\n    <div class="footer">\n      <p>© 2025 Tu Consultor Legal. Todos los derechos reservados.</p>\n      <p>Este es un correo automático, por favor no responder.</p>\n    </div>\n  </div>\n</body>\n</html>',
   '["document_type", "user_name", "user_email", "tracking_code", "created_at", "dashboard_url"]'::jsonb, true)
) AS v(template_key, template_name, subject, html_body, variables, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE template_key = v.template_key);

-- Continue with rest of templates...
INSERT INTO public.email_templates (template_key, template_name, subject, html_body, variables, is_active)
SELECT * FROM (VALUES
  ('document_in_review', 'Documento en Revisión', 'Tu documento {{document_type}} está siendo revisado',
   E'<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <style>\n    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }\n    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }\n    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }\n    .content { padding: 30px; color: #333; }\n    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }\n    .status-badge { background: #ffc107; color: #000; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 15px 0; }\n  </style>\n</head>\n<body>\n  <div class="container">\n    <div class="header"><h1>🔍 Documento en Revisión</h1></div>\n    <div class="content">\n      <p>Hola {{user_name}},</p>\n      <p>Tu documento <strong>{{document_type}}</strong> está siendo revisado.</p>\n      <div class="status-badge">⏳ En proceso</div>\n      <p><strong>Código:</strong> {{tracking_code}}</p>\n    </div>\n    <div class="footer"><p>© 2025 Tu Consultor Legal</p></div>\n  </div>\n</body>\n</html>',
   '["user_name", "document_type", "tracking_code"]'::jsonb, true),
  ('document_ready_for_review', 'Documento Listo', '¡Tu documento {{document_type}} está listo!',
   E'<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <style>\n    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }\n    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }\n    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }\n    .content { padding: 30px; color: #333; }\n    .button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }\n    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }\n    .price-box { background: #e8f5e9; padding: 20px; border-radius: 6px; margin: 15px 0; text-align: center; }\n    .price { font-size: 32px; font-weight: bold; color: #2e7d32; }\n  </style>\n</head>\n<body>\n  <div class="container">\n    <div class="header"><h1>✅ ¡Listo!</h1></div>\n    <div class="content">\n      <p>Hola {{user_name}},</p>\n      <p>Tu documento <strong>{{document_type}}</strong> está listo.</p>\n      <div class="price-box"><div class="price">${{price}} COP</div></div>\n      <a href="{{tracking_url}}" class="button">Ver y Pagar</a>\n    </div>\n    <div class="footer"><p>© 2025 Tu Consultor Legal</p></div>\n  </div>\n</body>\n</html>',
   '["user_name", "document_type", "tracking_code", "price", "tracking_url"]'::jsonb, true),
  ('document_paid', 'Pago Recibido', 'Pago recibido: {{document_type}}',
   E'<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <style>\n    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }\n    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }\n    .header { background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%); padding: 30px; text-align: center; color: white; }\n    .content { padding: 30px; color: #333; }\n    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }\n  </style>\n</head>\n<body>\n  <div class="container">\n    <div class="header"><h1>💳 Pago Recibido</h1></div>\n    <div class="content">\n      <p>Cliente <strong>{{user_name}}</strong> pagó:</p>\n      <p><strong>Documento:</strong> {{document_type}}</p>\n      <p><strong>Monto:</strong> ${{price}} COP</p>\n    </div>\n    <div class="footer"><p>© 2025 Tu Consultor Legal</p></div>\n  </div>\n</body>\n</html>',
   '["user_name", "document_type", "tracking_code", "price", "user_email"]'::jsonb, true),
  ('document_downloaded', 'Descargado', 'Documento descargado: {{document_type}}',
   E'<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <style>\n    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }\n    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }\n    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }\n    .content { padding: 30px; color: #333; }\n    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }\n  </style>\n</head>\n<body>\n  <div class="container">\n    <div class="header"><h1>📥 Descargado</h1></div>\n    <div class="content">\n      <p>Cliente <strong>{{user_name}}</strong> descargó {{document_type}}.</p>\n      <p><strong>Código:</strong> {{tracking_code}}</p>\n    </div>\n    <div class="footer"><p>© 2025 Tu Consultor Legal</p></div>\n  </div>\n</body>\n</html>',
   '["user_name", "user_email", "document_type", "tracking_code"]'::jsonb, true),
  ('lawyer_new_assignment', 'Asignación', 'Documento asignado: {{document_type}}',
   E'<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <style>\n    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }\n    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }\n    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }\n    .content { padding: 30px; color: #333; }\n    .button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }\n    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }\n  </style>\n</head>\n<body>\n  <div class="container">\n    <div class="header"><h1>📋 Nuevo</h1></div>\n    <div class="content">\n      <p>Hola {{lawyer_name}},</p>\n      <p>Documento asignado: {{document_type}}</p>\n      <p>Cliente: {{user_name}}</p>\n      <p>SLA: {{sla_hours}}h</p>\n      <a href="{{dashboard_url}}" class="button">Ver</a>\n    </div>\n    <div class="footer"><p>© 2025 Tu Consultor Legal</p></div>\n  </div>\n</body>\n</html>',
   '["lawyer_name", "document_type", "user_name", "tracking_code", "sla_hours", "dashboard_url"]'::jsonb, true)
) AS v(template_key, template_name, subject, html_body, variables, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE template_key = v.template_key);

-- 8. Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Triggers
CREATE TRIGGER update_email_configuration_updated_at
  BEFORE UPDATE ON public.email_configuration
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_updated_at();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_updated_at();