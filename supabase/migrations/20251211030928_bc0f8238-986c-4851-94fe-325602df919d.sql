-- =====================================================
-- NUEVAS PLANTILLAS DE EMAIL PARA NOTIFICACIONES A ABOGADOS
-- =====================================================

-- 1. Plantilla: Suscripción Activada
INSERT INTO email_templates (template_key, template_name, subject, html_body, variables, is_active)
VALUES (
  'lawyer_subscription_activated',
  'Suscripción Activada - Abogado',
  '🎉 ¡Tu suscripción está activa! - Tu Consultor Legal',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #0372E8, #1e88e5); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 ¡Suscripción Activada!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Hola <strong>{{lawyer_name}}</strong>,
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                ¡Excelentes noticias! Tu suscripción al plan <strong>{{plan_name}}</strong> ha sido activada exitosamente.
              </p>
              <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #2e7d32; margin: 0 0 10px 0;">Funcionalidades Desbloqueadas:</h3>
                <ul style="color: #333; margin: 0; padding-left: 20px;">
                  <li>✅ Crear agentes de documentos ilimitados</li>
                  <li>✅ Acceso completo a herramientas de IA</li>
                  <li>✅ Publicar artículos en el blog</li>
                  <li>✅ Perfil público profesional</li>
                  <li>✅ CRM para gestión de clientes</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{dashboard_url}}" style="background-color: #0372E8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Ir al Panel de Abogados
                </a>
              </div>
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Gracias por confiar en nosotros para potenciar tu práctica legal.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                © {{current_year}} Tu Consultor Legal. Todos los derechos reservados.<br>
                <a href="{{site_url}}" style="color: #0372E8;">{{site_url}}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["lawyer_name", "plan_name", "dashboard_url", "site_url", "current_year"]'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  subject = EXCLUDED.subject,
  updated_at = now();

-- 2. Plantilla: Suscripción Cancelada/Expirada
INSERT INTO email_templates (template_key, template_name, subject, html_body, variables, is_active)
VALUES (
  'lawyer_subscription_cancelled',
  'Suscripción Cancelada - Abogado',
  'Tu suscripción ha sido cancelada - Tu Consultor Legal',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #ff9800; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Suscripción Cancelada</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Hola <strong>{{lawyer_name}}</strong>,
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Te informamos que tu suscripción ha sido cancelada. Tus funcionalidades premium estarán disponibles hasta el <strong>{{end_date}}</strong>.
              </p>
              <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #e65100; margin: 0;">
                  <strong>Nota:</strong> Después de esta fecha, perderás acceso a:
                </p>
                <ul style="color: #333; margin: 10px 0 0 0; padding-left: 20px;">
                  <li>Creación de nuevos agentes</li>
                  <li>Herramientas de IA avanzadas</li>
                  <li>Publicación en el blog</li>
                </ul>
              </div>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Si deseas reactivar tu suscripción, puedes hacerlo en cualquier momento:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{reactivation_url}}" style="background-color: #0372E8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Reactivar Suscripción
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                © {{current_year}} Tu Consultor Legal. Todos los derechos reservados.<br>
                <a href="{{site_url}}" style="color: #0372E8;">{{site_url}}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["lawyer_name", "end_date", "reactivation_url", "site_url", "current_year"]'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  subject = EXCLUDED.subject,
  updated_at = now();

-- 3. Plantilla: Agente Aprobado
INSERT INTO email_templates (template_key, template_name, subject, html_body, variables, is_active)
VALUES (
  'lawyer_agent_approved',
  'Agente Aprobado - Abogado',
  '✅ ¡Tu agente "{{agent_name}}" ha sido aprobado! - Tu Consultor Legal',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #4caf50, #66bb6a); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ ¡Agente Aprobado!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Hola <strong>{{lawyer_name}}</strong>,
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                ¡Excelentes noticias! Tu agente <strong>"{{agent_name}}"</strong> ha sido aprobado y ahora está <strong>activo</strong> en la plataforma.
              </p>
              <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #2e7d32; margin: 0 0 10px 0;">¿Qué significa esto?</h3>
                <ul style="color: #333; margin: 0; padding-left: 20px;">
                  <li>Los usuarios ya pueden ver y usar tu agente</li>
                  <li>Recibirás notificaciones cuando genere documentos</li>
                  <li>Podrás revisar y aprobar los documentos generados</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{agent_url}}" style="background-color: #0372E8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
                  Ver Mi Agente
                </a>
                <a href="{{share_url}}" style="background-color: #25d366; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Compartir
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                © {{current_year}} Tu Consultor Legal. Todos los derechos reservados.<br>
                <a href="{{site_url}}" style="color: #0372E8;">{{site_url}}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["lawyer_name", "agent_name", "agent_url", "share_url", "site_url", "current_year"]'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  subject = EXCLUDED.subject,
  updated_at = now();

-- 4. Plantilla: Agente Rechazado/Suspendido
INSERT INTO email_templates (template_key, template_name, subject, html_body, variables, is_active)
VALUES (
  'lawyer_agent_rejected',
  'Agente Rechazado - Abogado',
  '⚠️ Tu agente "{{agent_name}}" requiere cambios - Tu Consultor Legal',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #f44336; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ Agente Requiere Cambios</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Hola <strong>{{lawyer_name}}</strong>,
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Tu agente <strong>"{{agent_name}}"</strong> ha sido revisado y requiere algunos ajustes antes de ser aprobado.
              </p>
              <div style="background-color: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #c62828; margin: 0 0 10px 0;">Motivo:</h3>
                <p style="color: #333; margin: 0;">{{reason}}</p>
              </div>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Por favor, revisa y actualiza tu agente para que pueda ser aprobado.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{dashboard_url}}" style="background-color: #0372E8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Editar Mi Agente
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                © {{current_year}} Tu Consultor Legal. Todos los derechos reservados.<br>
                <a href="{{site_url}}" style="color: #0372E8;">{{site_url}}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["lawyer_name", "agent_name", "reason", "dashboard_url", "site_url", "current_year"]'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  subject = EXCLUDED.subject,
  updated_at = now();

-- 5. Plantilla: Usuario envió observaciones
INSERT INTO email_templates (template_key, template_name, subject, html_body, variables, is_active)
VALUES (
  'lawyer_user_observations',
  'Usuario Envió Observaciones - Abogado',
  '📝 {{user_name}} ha enviado observaciones sobre su documento - Tu Consultor Legal',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #ff9800; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📝 Nuevas Observaciones del Usuario</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Hola <strong>{{lawyer_name}}</strong>,
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                El usuario <strong>{{user_name}}</strong> ha revisado el documento <strong>"{{document_type}}"</strong> y ha enviado observaciones que requieren tu atención.
              </p>
              <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #e65100; margin: 0 0 10px 0;">Observaciones del usuario:</h3>
                <p style="color: #333; margin: 0; white-space: pre-wrap;">{{observations_summary}}</p>
              </div>
              <table width="100%" style="margin: 20px 0; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border: 1px solid #e0e0e0; background-color: #f9f9f9;"><strong>Código:</strong></td>
                  <td style="padding: 10px; border: 1px solid #e0e0e0;">{{token}}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e0e0e0; background-color: #f9f9f9;"><strong>Usuario:</strong></td>
                  <td style="padding: 10px; border: 1px solid #e0e0e0;">{{user_name}} ({{user_email}})</td>
                </tr>
              </table>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{dashboard_url}}" style="background-color: #0372E8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Revisar Documento
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                © {{current_year}} Tu Consultor Legal. Todos los derechos reservados.<br>
                <a href="{{site_url}}" style="color: #0372E8;">{{site_url}}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["lawyer_name", "user_name", "user_email", "document_type", "token", "observations_summary", "dashboard_url", "site_url", "current_year"]'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  subject = EXCLUDED.subject,
  updated_at = now();

-- 6. Plantilla: Certificación Completada
INSERT INTO email_templates (template_key, template_name, subject, html_body, variables, is_active)
VALUES (
  'lawyer_certification_completed',
  'Certificación Completada - Abogado',
  '🎓 ¡Felicitaciones! Has obtenido tu Certificación IA Lawyer - Tu Consultor Legal',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #9c27b0, #ba68c8); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎓 ¡Certificación Obtenida!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Hola <strong>{{lawyer_name}}</strong>,
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                ¡Felicitaciones! Has completado exitosamente el programa de <strong>Certificación IA Lawyer Fundamentals</strong> de Tu Consultor Legal.
              </p>
              <div style="background-color: #f3e5f5; border: 2px solid #9c27b0; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
                <p style="color: #7b1fa2; font-size: 14px; margin: 0 0 10px 0;">Tu código de certificación:</p>
                <p style="color: #4a148c; font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 2px;">{{certificate_code}}</p>
              </div>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Esta certificación valida tus conocimientos en el uso de inteligencia artificial aplicada a la práctica legal.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{verification_url}}" style="background-color: #9c27b0; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
                  Ver Certificado
                </a>
                <a href="{{linkedin_url}}" style="background-color: #0077b5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Compartir en LinkedIn
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                © {{current_year}} Tu Consultor Legal. Todos los derechos reservados.<br>
                <a href="{{site_url}}" style="color: #0372E8;">{{site_url}}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["lawyer_name", "certificate_code", "verification_url", "linkedin_url", "site_url", "current_year"]'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  subject = EXCLUDED.subject,
  updated_at = now();

-- 7. Plantilla: Blog Aprobado
INSERT INTO email_templates (template_key, template_name, subject, html_body, variables, is_active)
VALUES (
  'lawyer_blog_approved',
  'Blog Aprobado - Abogado',
  '📰 ¡Tu artículo "{{blog_title}}" ha sido publicado! - Tu Consultor Legal',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #0372E8, #1e88e5); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📰 ¡Artículo Publicado!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Hola <strong>{{lawyer_name}}</strong>,
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                ¡Excelentes noticias! Tu artículo <strong>"{{blog_title}}"</strong> ha sido aprobado y publicado en el blog de Tu Consultor Legal.
              </p>
              <div style="background-color: #e3f2fd; border-left: 4px solid #0372E8; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #333; margin: 0;">
                  Tu artículo ya está disponible para todos los visitantes de la plataforma. ¡Compártelo en tus redes sociales para mayor alcance!
                </p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{blog_url}}" style="background-color: #0372E8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Ver Mi Artículo
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                © {{current_year}} Tu Consultor Legal. Todos los derechos reservados.<br>
                <a href="{{site_url}}" style="color: #0372E8;">{{site_url}}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["lawyer_name", "blog_title", "blog_url", "site_url", "current_year"]'::jsonb,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  subject = EXCLUDED.subject,
  updated_at = now();

-- =====================================================
-- ACTUALIZAR TRIGGER DE CERTIFICACIÓN PARA ENVIAR EMAIL
-- =====================================================

CREATE OR REPLACE FUNCTION public.issue_certificate_on_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    lawyer_info RECORD;
    cert_code TEXT;
    template_record RECORD;
    email_subject TEXT;
    email_html TEXT;
    request_id BIGINT;
BEGIN
    -- Only trigger when completion percentage reaches 100% and is_certified becomes true
    IF NEW.completion_percentage >= 100.00 AND NEW.is_certified = true AND (OLD.is_certified IS NULL OR OLD.is_certified = false) THEN
        -- Get lawyer information from lawyer_profiles
        SELECT lp.full_name, lp.email 
        INTO lawyer_info
        FROM lawyer_profiles lp 
        WHERE lp.id = NEW.lawyer_id;
        
        -- Generate unique certificate code
        cert_code := 'IALC-' || to_char(now(), 'YYYY') || '-' || substr(md5(random()::text), 1, 8);
        
        -- Set certificate_id in training progress
        NEW.certificate_id := cert_code;
        
        -- Insert certificate record
        INSERT INTO public.lawyer_certificates (
            lawyer_id,
            certificate_type,
            certificate_name,
            certificate_code,
            verification_url,
            linkedin_share_url
        ) VALUES (
            NEW.lawyer_id,
            'ai_lawyer_fundamentals',
            'Certificación IA Lawyer Fundamentals - tuconsultorlegal.co',
            cert_code,
            'https://tuconsultorlegal.co/certificacion/' || cert_code,
            'https://www.linkedin.com/sharing/share-offsite/?url=https://tuconsultorlegal.co/certificacion/' || cert_code
        );
        
        RAISE LOG 'Certificate issued for lawyer: % with code: %', lawyer_info.full_name, cert_code;
        
        -- Send certification email notification
        SELECT * INTO template_record
        FROM public.email_templates
        WHERE template_key = 'lawyer_certification_completed'
        AND is_active = true
        LIMIT 1;
        
        IF FOUND THEN
            email_subject := template_record.subject;
            email_subject := REPLACE(email_subject, '{{lawyer_name}}', lawyer_info.full_name);
            email_subject := REPLACE(email_subject, '{{certificate_code}}', cert_code);
            
            email_html := template_record.html_body;
            email_html := REPLACE(email_html, '{{lawyer_name}}', lawyer_info.full_name);
            email_html := REPLACE(email_html, '{{certificate_code}}', cert_code);
            email_html := REPLACE(email_html, '{{verification_url}}', 'https://tuconsultorlegal.co/certificacion/' || cert_code);
            email_html := REPLACE(email_html, '{{linkedin_url}}', 'https://www.linkedin.com/sharing/share-offsite/?url=https://tuconsultorlegal.co/certificacion/' || cert_code);
            email_html := REPLACE(email_html, '{{site_url}}', 'https://tuconsultorlegal.co');
            email_html := REPLACE(email_html, '{{current_year}}', EXTRACT(YEAR FROM NOW())::TEXT);
            
            -- Call send-email edge function
            BEGIN
                SELECT extensions.http_post(
                    url := 'https://tkaezookvtpulfpaffes.supabase.co/functions/v1/send-email',
                    headers := jsonb_build_object('Content-Type', 'application/json'),
                    body := jsonb_build_object(
                        'to', lawyer_info.email,
                        'subject', email_subject,
                        'html', email_html,
                        'template_key', 'lawyer_certification_completed',
                        'recipient_type', 'lawyer'
                    )
                ) INTO request_id;
                
                RAISE LOG 'Certification email queued for lawyer: % (request_id: %)', lawyer_info.full_name, request_id;
            EXCEPTION WHEN OTHERS THEN
                RAISE LOG 'Error sending certification email: %', SQLERRM;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;