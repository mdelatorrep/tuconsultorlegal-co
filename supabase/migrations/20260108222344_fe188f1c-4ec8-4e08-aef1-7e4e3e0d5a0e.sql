-- Insert re-engagement email template
INSERT INTO email_templates (template_key, template_name, subject, html_body, variables, is_active)
VALUES (
  'lawyer_reengagement',
  'Email de Re-engagement para Abogados',
  '¡Te extrañamos en Tu Consultor Legal! 👋',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a365d 0%, #2d5a8a 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Tu Consultor Legal</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1a365d;">Hola {{lawyer_name}},</h2>
    
    <p>Notamos que no has visitado la plataforma en los últimos <strong>{{days_inactive}} días</strong> y queríamos saber cómo podemos ayudarte.</p>
    
    <p>Mientras estuviste ausente, hemos seguido mejorando:</p>
    <ul style="color: #4a5568;">
      <li>🤖 Nuevas herramientas de IA para análisis legal</li>
      <li>📄 Más plantillas de documentos disponibles</li>
      <li>⚡ Mejoras en velocidad y rendimiento</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://tuconsultorlegal.co/abogados" style="background: linear-gradient(135deg, #1a365d 0%, #2d5a8a 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
        Volver a la Plataforma
      </a>
    </div>
    
    <p style="color: #718096; font-size: 14px;">
      ¿Tienes alguna pregunta o sugerencia? Responde a este correo y te ayudaremos.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
    
    <p style="color: #a0aec0; font-size: 12px; text-align: center;">
      Tu Consultor Legal - Haciendo el derecho accesible para todos<br>
      © 2025 Todos los derechos reservados
    </p>
  </div>
</body>
</html>',
  '{"lawyer_name": "Nombre del abogado", "days_inactive": "Días de inactividad"}',
  true
);