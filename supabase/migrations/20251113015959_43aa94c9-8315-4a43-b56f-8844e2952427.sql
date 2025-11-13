-- ============================================
-- FASE 1: TRIGGER PARA NOTIFICACIONES AUTOMÁTICAS
-- ============================================

-- Crear trigger que ejecuta la función existente notify_document_status_change()
-- cuando cambia el estado de un documento
DROP TRIGGER IF EXISTS trigger_notify_document_status_change ON document_tokens;

CREATE TRIGGER trigger_notify_document_status_change
AFTER UPDATE ON document_tokens
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION notify_document_status_change();

-- ============================================
-- FASE 2: PLANTILLAS DE EMAIL FALTANTES
-- ============================================

-- Plantilla: Confirmación de solicitud al usuario
INSERT INTO email_templates (
  template_key,
  template_name,
  subject,
  html_body,
  is_active,
  variables
) VALUES (
  'document_confirmation_user',
  'Confirmación de Solicitud de Documento - Usuario',
  '✅ Solicitud recibida: {{document_type}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #d97706; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ ¡Solicitud Recibida!</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{user_name}}</strong>,</p>
      
      <p>Tu solicitud de documento <strong>{{document_type}}</strong> ha sido recibida correctamente.</p>
      
      <p><strong>📋 Detalles de tu solicitud:</strong></p>
      <ul>
        <li>Token de seguimiento: <strong>{{token}}</strong></li>
        <li>Precio: <strong>${{price}}</strong></li>
        <li>Fecha estimada de entrega: <strong>{{sla_deadline}}</strong></li>
      </ul>
      
      <p>Nuestro equipo legal está procesando tu solicitud. Te notificaremos cuando esté lista para revisión.</p>
      
      <div style="text-align: center;">
        <a href="{{tracking_url}}" class="button">🔍 Ver Estado del Documento</a>
      </div>
      
      <p><strong>Próximos pasos:</strong></p>
      <ol>
        <li>Revisión por nuestro equipo legal</li>
        <li>Te enviaremos el documento para tu aprobación</li>
        <li>Realizas el pago seguro</li>
        <li>Descargas tu documento final</li>
      </ol>
    </div>
    <div class="footer">
      <p>Tu Consultor Legal - Excelencia Jurídica</p>
      <p><a href="{{site_url}}">{{site_url}}</a></p>
      <p>© {{current_year}} Todos los derechos reservados</p>
    </div>
  </div>
</body>
</html>',
  true,
  '["user_name", "document_type", "token", "price", "sla_deadline", "tracking_url", "site_url", "current_year"]'::jsonb
) ON CONFLICT (template_key) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  is_active = EXCLUDED.is_active,
  variables = EXCLUDED.variables;

-- Plantilla: Confirmación de revisión completada al abogado
INSERT INTO email_templates (
  template_key,
  template_name,
  subject,
  html_body,
  is_active,
  variables
) VALUES (
  'lawyer_review_completed',
  'Confirmación de Revisión Enviada - Abogado',
  '✅ Revisión enviada al usuario: {{document_type}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Revisión Completada</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{lawyer_name}}</strong>,</p>
      
      <div class="success">
        <p><strong>✓ Tu revisión del documento ha sido enviada al usuario.</strong></p>
      </div>
      
      <p><strong>📄 Información del documento:</strong></p>
      <ul>
        <li>Tipo: <strong>{{document_type}}</strong></li>
        <li>Token: <strong>{{token}}</strong></li>
        <li>Usuario: <strong>{{user_name}}</strong> ({{user_email}})</li>
      </ul>
      
      <p>El usuario recibirá una notificación para revisar y aprobar el documento. Una vez aprobado, se procesará el pago y podrás ver la confirmación en tu dashboard.</p>
      
      <p><em>Gracias por tu excelente trabajo.</em></p>
    </div>
    <div class="footer">
      <p>Tu Consultor Legal - Panel de Abogados</p>
      <p><a href="{{dashboard_url}}">Ir al Dashboard</a></p>
      <p>© {{current_year}} Todos los derechos reservados</p>
    </div>
  </div>
</body>
</html>',
  true,
  '["lawyer_name", "document_type", "token", "user_name", "user_email", "dashboard_url", "current_year"]'::jsonb
) ON CONFLICT (template_key) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  is_active = EXCLUDED.is_active,
  variables = EXCLUDED.variables;

-- Plantilla: Confirmación de pago al usuario
INSERT INTO email_templates (
  template_key,
  template_name,
  subject,
  html_body,
  is_active,
  variables
) VALUES (
  'payment_confirmation_user',
  'Confirmación de Pago - Usuario',
  '💳 Pago confirmado: {{document_type}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #d97706; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💳 ¡Pago Confirmado!</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{user_name}}</strong>,</p>
      
      <div class="success">
        <p><strong>✓ Tu pago ha sido procesado exitosamente.</strong></p>
      </div>
      
      <p>Tu documento <strong>{{document_type}}</strong> está ahora disponible para descarga.</p>
      
      <p><strong>📋 Resumen:</strong></p>
      <ul>
        <li>Token: <strong>{{token}}</strong></li>
        <li>Monto pagado: <strong>${{price}}</strong></li>
        <li>Fecha de pago: <strong>{{payment_date}}</strong></li>
      </ul>
      
      <div style="text-align: center;">
        <a href="{{tracking_url}}" class="button">📥 Descargar Documento</a>
      </div>
      
      <p><strong>¿Qué puedes hacer ahora?</strong></p>
      <ul>
        <li>Descargar tu documento en formato PDF</li>
        <li>Guardarlo de forma segura</li>
        <li>Contactarnos si necesitas modificaciones</li>
      </ul>
    </div>
    <div class="footer">
      <p>Tu Consultor Legal - Excelencia Jurídica</p>
      <p><a href="{{site_url}}">{{site_url}}</a></p>
      <p>© {{current_year}} Todos los derechos reservados</p>
    </div>
  </div>
</body>
</html>',
  true,
  '["user_name", "document_type", "token", "price", "payment_date", "tracking_url", "site_url", "current_year"]'::jsonb
) ON CONFLICT (template_key) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  is_active = EXCLUDED.is_active,
  variables = EXCLUDED.variables;

-- Plantilla: Agradecimiento por descarga al usuario
INSERT INTO email_templates (
  template_key,
  template_name,
  subject,
  html_body,
  is_active,
  variables
) VALUES (
  'download_confirmation_user',
  'Agradecimiento por Descarga - Usuario',
  '📥 Gracias por descargar tu documento',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #d97706; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📥 ¡Gracias por Confiar en Nosotros!</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{user_name}}</strong>,</p>
      
      <p>Has descargado exitosamente tu documento <strong>{{document_type}}</strong>.</p>
      
      <p><strong>💡 Recomendaciones:</strong></p>
      <ul>
        <li>Guarda el documento en un lugar seguro</li>
        <li>Realiza copias de respaldo</li>
        <li>Revisa que toda la información esté correcta</li>
      </ul>
      
      <p>Si necesitas alguna modificación o tienes preguntas sobre tu documento, no dudes en contactarnos.</p>
      
      <div style="text-align: center;">
        <a href="{{site_url}}" class="button">🔍 Solicitar Otro Documento</a>
      </div>
      
      <p><strong>Servicios adicionales:</strong></p>
      <ul>
        <li>Consultoría legal personalizada</li>
        <li>Revisión de documentos</li>
        <li>Asesoría jurídica especializada</li>
      </ul>
    </div>
    <div class="footer">
      <p>Tu Consultor Legal - Excelencia Jurídica</p>
      <p><a href="{{site_url}}">{{site_url}}</a></p>
      <p>© {{current_year}} Todos los derechos reservados</p>
    </div>
  </div>
</body>
</html>',
  true,
  '["user_name", "document_type", "site_url", "current_year"]'::jsonb
) ON CONFLICT (template_key) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  is_active = EXCLUDED.is_active,
  variables = EXCLUDED.variables;

-- Plantilla: Nueva asignación de documento al abogado
INSERT INTO email_templates (
  template_key,
  template_name,
  subject,
  html_body,
  is_active,
  variables
) VALUES (
  'lawyer_new_assignment',
  'Nueva Asignación de Documento - Abogado',
  '📋 Nuevo documento asignado: {{document_type}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #f87171 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #1e3a8a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Nuevo Documento Asignado</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{lawyer_name}}</strong>,</p>
      
      <div class="alert">
        <p><strong>⚡ Tienes un nuevo documento que requiere tu revisión.</strong></p>
      </div>
      
      <p><strong>📄 Información del documento:</strong></p>
      <ul>
        <li>Tipo: <strong>{{document_type}}</strong></li>
        <li>Token: <strong>{{token}}</strong></li>
        <li>Usuario: <strong>{{user_name}}</strong> ({{user_email}})</li>
        <li>Fecha límite SLA: <strong>{{sla_deadline}}</strong></li>
      </ul>
      
      <div style="text-align: center;">
        <a href="{{dashboard_url}}" class="button">📝 Revisar Documento</a>
      </div>
      
      <p><strong>Próximos pasos:</strong></p>
      <ol>
        <li>Revisar el contenido del documento</li>
        <li>Realizar las correcciones necesarias</li>
        <li>Enviar para aprobación del usuario</li>
      </ol>
    </div>
    <div class="footer">
      <p>Tu Consultor Legal - Panel de Abogados</p>
      <p><a href="{{dashboard_url}}">Ir al Dashboard</a></p>
      <p>© {{current_year}} Todos los derechos reservados</p>
    </div>
  </div>
</body>
</html>',
  true,
  '["lawyer_name", "document_type", "token", "user_name", "user_email", "sla_deadline", "dashboard_url", "current_year"]'::jsonb
) ON CONFLICT (template_key) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  is_active = EXCLUDED.is_active,
  variables = EXCLUDED.variables;

-- Plantilla: Documento listo para revisión del usuario
INSERT INTO email_templates (
  template_key,
  template_name,
  subject,
  html_body,
  is_active,
  variables
) VALUES (
  'document_ready_for_review',
  'Documento Listo para Revisión - Usuario',
  '📄 Tu documento está listo para revisión',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #d97706; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .highlight { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 ¡Tu Documento Está Listo!</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{user_name}}</strong>,</p>
      
      <div class="highlight">
        <p><strong>✓ Tu documento ha sido revisado por nuestro equipo legal.</strong></p>
      </div>
      
      <p>El documento <strong>{{document_type}}</strong> está listo para tu revisión y aprobación.</p>
      
      <p><strong>📋 Detalles:</strong></p>
      <ul>
        <li>Token: <strong>{{token}}</strong></li>
        <li>Revisado por: <strong>{{lawyer_name}}</strong></li>
        <li>Precio: <strong>${{price}}</strong></li>
      </ul>
      
      <div style="text-align: center;">
        <a href="{{tracking_url}}" class="button">👁️ Revisar y Aprobar</a>
      </div>
      
      <p><strong>¿Qué hacer ahora?</strong></p>
      <ol>
        <li>Revisa el documento cuidadosamente</li>
        <li>Verifica que toda la información sea correcta</li>
        <li>Si estás conforme, procede al pago</li>
        <li>Si necesitas cambios, contáctanos</li>
      </ol>
    </div>
    <div class="footer">
      <p>Tu Consultor Legal - Excelencia Jurídica</p>
      <p><a href="{{site_url}}">{{site_url}}</a></p>
      <p>© {{current_year}} Todos los derechos reservados</p>
    </div>
  </div>
</body>
</html>',
  true,
  '["user_name", "document_type", "token", "lawyer_name", "price", "tracking_url", "site_url", "current_year"]'::jsonb
) ON CONFLICT (template_key) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  is_active = EXCLUDED.is_active,
  variables = EXCLUDED.variables;

-- Plantilla: Notificación al abogado creador del agente
INSERT INTO email_templates (
  template_key,
  template_name,
  subject,
  html_body,
  is_active,
  variables
) VALUES (
  'lawyer_document_from_agent',
  'Documento Generado por tu Agente - Abogado',
  '🤖 Tu agente generó un documento: {{document_type}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 ¡Agente en Acción!</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{lawyer_name}}</strong>,</p>
      
      <div class="success">
        <p><strong>✓ Tu agente IA ha generado un nuevo documento.</strong></p>
      </div>
      
      <p><strong>📊 Información del documento:</strong></p>
      <ul>
        <li>Agente: <strong>{{agent_name}}</strong></li>
        <li>Tipo: <strong>{{document_type}}</strong></li>
        <li>Token: <strong>{{token}}</strong></li>
        <li>Usuario: <strong>{{user_name}}</strong> ({{user_email}})</li>
      </ul>
      
      <p>Este documento fue generado automáticamente por tu agente IA a través de una conversación con el usuario.</p>
      
      <p><strong>📈 Estadísticas:</strong></p>
      <ul>
        <li>Total generados: <strong>{{total_documents}}</strong></li>
        <li>Tasa de éxito: <strong>{{success_rate}}%</strong></li>
      </ul>
    </div>
    <div class="footer">
      <p>Tu Consultor Legal - Panel de Abogados</p>
      <p><a href="{{dashboard_url}}">Ir al Dashboard</a></p>
      <p>© {{current_year}} Todos los derechos reservados</p>
    </div>
  </div>
</body>
</html>',
  true,
  '["lawyer_name", "agent_name", "document_type", "token", "user_name", "user_email", "total_documents", "success_rate", "dashboard_url", "current_year"]'::jsonb
) ON CONFLICT (template_key) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  is_active = EXCLUDED.is_active,
  variables = EXCLUDED.variables;