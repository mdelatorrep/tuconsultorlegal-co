UPDATE email_templates 
SET 
  template_name = 'Documento Finalizado - Notificación Abogado',
  subject = 'Proceso completado: {{document_type}}',
  html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #0372E8 0%, #0056b3 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; color: #333; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    .info-box { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .info-box strong { color: #0372E8; }
    .success-badge { background: #e8f5e9; color: #2e7d32; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Proceso Completado</h1>
    </div>
    <div class="content">
      <p>Hola,</p>
      <p>El usuario <strong>{{user_name}}</strong> ha finalizado exitosamente su proceso para el documento:</p>
      <div class="info-box">
        <p><strong>Documento:</strong> {{document_type}}</p>
        <p><strong>Código de seguimiento:</strong> {{tracking_code}}</p>
        <p><strong>Usuario:</strong> {{user_email}}</p>
        <p style="margin-top: 15px;"><span class="success-badge">✓ Listo para descarga</span></p>
      </div>
      <p>El documento ya está disponible y el usuario puede descargarlo cuando lo desee.</p>
      <p style="color: #6c757d; font-size: 14px; margin-top: 20px;">Este es un resumen informativo del proceso completado.</p>
    </div>
    <div class="footer">
      <p>© 2025 Tu Consultor Legal. Todos los derechos reservados.</p>
      <p>Este es un correo automático, por favor no responder.</p>
    </div>
  </div>
</body>
</html>',
  updated_at = now()
WHERE template_key = 'document_paid';