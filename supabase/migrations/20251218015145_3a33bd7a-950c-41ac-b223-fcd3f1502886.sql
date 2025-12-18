-- Insert email template for user download confirmation
INSERT INTO email_templates (template_key, template_name, subject, html_body, variables, is_active)
VALUES (
  'document_download_user',
  'Confirmación de Descarga - Usuario',
  'Tu documento ha sido descargado: {{document_type}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0372E8 0%, #0056b3 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">✅ Documento Descargado</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hola <strong>{{user_name}}</strong>,</p>
    
    <p>Tu documento <strong>{{document_type}}</strong> ha sido descargado exitosamente.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
      <h3 style="color: #22c55e; margin-top: 0;">📄 Detalles de tu documento:</h3>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Tipo:</strong> {{document_type}}</li>
        <li style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Código de seguimiento:</strong> {{tracking_code}}</li>
        <li style="padding: 8px 0;"><strong>Fecha de descarga:</strong> {{download_date}}</li>
      </ul>
    </div>
    
    <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #2e7d32;">
        <strong>💡 Tip:</strong> Guarda tu código de seguimiento <strong>{{tracking_code}}</strong> para consultar tu documento en el futuro.
      </p>
    </div>
    
    <p>Si necesitas descargar el documento nuevamente, puedes hacerlo desde:</p>
    
    <div style="text-align: center; margin: 25px 0;">
      <a href="{{tracking_url}}" style="display: inline-block; background: #0372E8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
        Ver Mi Documento
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
    
    <p style="color: #666; font-size: 14px;">
      ¿Tienes preguntas? Responde a este correo o visita nuestra página de soporte.
    </p>
    
    <p style="margin-bottom: 0;">Gracias por confiar en nosotros,</p>
    <p style="margin-top: 5px;"><strong>El equipo de Tu Consultor Legal</strong></p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>© 2024 Tu Consultor Legal. Todos los derechos reservados.</p>
    <p><a href="https://tuconsultorlegal.co" style="color: #0372E8;">www.tuconsultorlegal.co</a></p>
  </div>
</body>
</html>',
  '["user_name", "document_type", "tracking_code", "download_date", "tracking_url"]'::jsonb,
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active,
  updated_at = now();