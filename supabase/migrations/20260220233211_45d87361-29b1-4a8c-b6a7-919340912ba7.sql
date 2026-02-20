INSERT INTO email_templates (template_key, template_name, subject, html_body, variables, is_active)
VALUES (
  'process_update',
  'Alerta de Proceso Judicial',
  '📋 {{notification_title}}',
  '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Proceso</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📋 Alerta de Proceso Judicial</h1>
    <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Praxis Hub - Monitor de Procesos</p>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hola <strong>{{lawyer_name}}</strong>,</p>
    <p style="font-size: 16px; margin-bottom: 20px;">Se han detectado novedades en uno de tus procesos monitoreados:</p>
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e293b;">
      <h2 style="color: #1e293b; margin-top: 0; font-size: 18px;">{{notification_title}}</h2>
      <p style="margin: 10px 0;"><strong>Radicado:</strong> <code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-family: monospace;">{{radicado}}</code></p>
      <p style="margin: 10px 0;">{{notification_message}}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="display: inline-block; background: linear-gradient(135deg, #1e293b 0%, #475569 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Ver en Monitor de Procesos</a>
    </div>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    <p style="font-size: 14px; color: #666; text-align: center;">Mensaje automático de <strong>Praxis Hub</strong><br><a href="https://praxis-hub.co" style="color: #1e293b;">praxis-hub.co</a></p>
    <p style="font-size: 12px; color: #999; text-align: center;">© {{current_year}} Praxis Hub. Todos los derechos reservados.</p>
  </div>
</body>
</html>',
  '["lawyer_name", "notification_title", "notification_message", "radicado", "action_url", "current_year"]'::jsonb,
  true
);