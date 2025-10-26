-- Insertar plantilla de email de bienvenida para abogados
INSERT INTO email_templates (
  template_key,
  template_name,
  subject,
  html_body,
  variables,
  is_active
) VALUES (
  'lawyer_welcome',
  'Bienvenida de Abogado',
  '¡Bienvenido a Tu Consultor Legal, {{lawyer_name}}!',
  '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #0372e8 0%, #0563c9 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .header .icon { font-size: 48px; margin-bottom: 10px; }
    .content { padding: 40px 30px; color: #333; line-height: 1.6; }
    .content h2 { color: #0372e8; margin: 0 0 20px 0; font-size: 24px; }
    .features { background: #f8f9fa; border-left: 4px solid #0372e8; padding: 20px; margin: 24px 0; border-radius: 4px; }
    .features h3 { color: #0372e8; margin: 0 0 12px 0; font-size: 18px; }
    .features ul { margin: 0; padding-left: 20px; color: #555; }
    .features li { margin-bottom: 8px; }
    .button { background: #0372e8; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 32px 0; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; }
    .footer p { color: #6c757d; font-size: 12px; margin: 5px 0; }
    .footer a { color: #0372e8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">⚖️</div>
      <h1>Tu Consultor Legal</h1>
    </div>
    <div class="content">
      <h2>¡Bienvenido, {{lawyer_name}}!</h2>
      <p>Nos complace darte la bienvenida a <strong>Tu Consultor Legal</strong>, la plataforma de inteligencia artificial diseñada específicamente para abogados en Colombia.</p>
      <p>Tu cuenta ha sido creada exitosamente y ya puedes comenzar a disfrutar de todas nuestras funcionalidades.</p>
      
      <div class="features">
        <h3>¿Qué puedes hacer ahora?</h3>
        <ul>
          <li>Analizar documentos legales con IA</li>
          <li>Redactar contratos y demandas</li>
          <li>Investigar jurisprudencia colombiana</li>
          <li>Desarrollar estrategias legales</li>
          <li>Gestionar tu CRM de clientes</li>
        </ul>
      </div>
      
      <center>
        <a href="{{dashboard_url}}" class="button">Acceder a mi Dashboard</a>
      </center>
      
      <p style="margin-top: 24px; color: #666; font-size: 14px;">Si tienes alguna pregunta o necesitas ayuda, nuestro equipo de soporte está disponible 24/7 para asistirte.</p>
    </div>
    <div class="footer">
      <p>© {{current_year}} Tu Consultor Legal. Todos los derechos reservados.</p>
      <p>
        <a href="{{site_url}}/#privacidad">Política de Privacidad</a> | 
        <a href="{{site_url}}/#terminos">Términos y Condiciones</a>
      </p>
    </div>
  </div>
</body>
</html>',
  '["lawyer_name", "dashboard_url", "current_year", "site_url"]'::jsonb,
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active,
  updated_at = now();