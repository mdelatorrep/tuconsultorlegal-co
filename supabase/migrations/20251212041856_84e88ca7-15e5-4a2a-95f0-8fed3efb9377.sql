-- Insertar plantilla de bienvenida para usuarios
INSERT INTO email_templates (template_key, template_name, subject, html_body, is_active, variables)
VALUES (
  'user_welcome',
  'Bienvenida Usuario - Tu Consultor Legal',
  '¡Bienvenido a Tu Consultor Legal, {{user_name}}!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #0372E8 0%, #0056b3 100%); padding: 40px 30px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px; color: #333; line-height: 1.6; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    .btn { display: inline-block; background: #0372E8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .feature-list { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .feature-list li { margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡Bienvenido a Tu Consultor Legal!</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{user_name}}</strong>,</p>
      <p>Gracias por registrarte en Tu Consultor Legal. Estamos emocionados de tenerte con nosotros.</p>
      <p>Ahora puedes acceder a todos nuestros servicios legales:</p>
      <ul class="feature-list">
        <li>📄 Genera documentos legales personalizados en minutos</li>
        <li>⚖️ Documentos revisados por abogados profesionales</li>
        <li>💬 Asistencia guiada paso a paso</li>
        <li>📱 Acceso desde cualquier dispositivo</li>
      </ul>
      <p style="text-align: center;">
        <a href="{{dashboard_url}}" class="btn">Ir a Mi Dashboard</a>
      </p>
      <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
      <p>Saludos cordiales,<br>El equipo de Tu Consultor Legal</p>
    </div>
    <div class="footer">
      <p>© {{current_year}} Tu Consultor Legal. Todos los derechos reservados.</p>
      <p><a href="{{site_url}}" style="color: #0372E8;">www.tuconsultorlegal.co</a></p>
    </div>
  </div>
</body>
</html>',
  true,
  '["user_name", "dashboard_url", "site_url", "current_year"]'::jsonb
);

-- Insertar plantilla de confirmación de contacto
INSERT INTO email_templates (template_key, template_name, subject, html_body, is_active, variables)
VALUES (
  'contact_confirmation_user',
  'Confirmación de Mensaje de Contacto - Usuario',
  'Hemos recibido tu mensaje, {{user_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #0372E8 0%, #0056b3 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; color: #333; line-height: 1.6; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    .info-box { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0372E8; }
    .message-preview { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; font-style: italic; color: #555; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Mensaje Recibido</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{user_name}}</strong>,</p>
      <p>Hemos recibido tu mensaje correctamente. Nuestro equipo lo revisará y te responderá a la brevedad.</p>
      <div class="info-box">
        <p><strong>Tipo de consulta:</strong> {{consultation_type}}</p>
        <p><strong>Tiempo estimado de respuesta:</strong> 24-48 horas hábiles</p>
      </div>
      <p><strong>Tu mensaje:</strong></p>
      <div class="message-preview">{{message_preview}}</div>
      <p>Mientras tanto, puedes explorar nuestros documentos legales disponibles en nuestra plataforma.</p>
      <p>Gracias por contactarnos.</p>
      <p>Saludos cordiales,<br>El equipo de Tu Consultor Legal</p>
    </div>
    <div class="footer">
      <p>© {{current_year}} Tu Consultor Legal. Todos los derechos reservados.</p>
      <p><a href="{{site_url}}" style="color: #0372E8;">www.tuconsultorlegal.co</a></p>
    </div>
  </div>
</body>
</html>',
  true,
  '["user_name", "consultation_type", "message_preview", "site_url", "current_year"]'::jsonb
);

-- Insertar plantilla de confirmación de solicitud de documento personalizado
INSERT INTO email_templates (template_key, template_name, subject, html_body, is_active, variables)
VALUES (
  'custom_document_request_user',
  'Confirmación de Solicitud de Documento Personalizado',
  'Tu solicitud de documento ha sido recibida',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #0372E8 0%, #0056b3 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; color: #333; line-height: 1.6; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .urgency-badge { display: inline-block; padding: 5px 12px; border-radius: 15px; font-size: 12px; font-weight: bold; }
    .urgency-normal { background: #e8f5e9; color: #2e7d32; }
    .urgency-urgent { background: #fff3e0; color: #e65100; }
    .urgency-very-urgent { background: #ffebee; color: #c62828; }
    .next-steps { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .next-steps ol { margin: 10px 0; padding-left: 20px; }
    .next-steps li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📝 Solicitud Recibida</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{user_name}}</strong>,</p>
      <p>Hemos recibido tu solicitud de documento personalizado. Nuestro equipo de abogados la revisará y te contactará pronto.</p>
      <div class="info-box">
        <p><strong>Tipo de documento:</strong> {{document_type}}</p>
        <p><strong>Urgencia:</strong> <span class="urgency-badge {{urgency_class}}">{{urgency}}</span></p>
        <p><strong>Descripción:</strong></p>
        <p style="color: #555;">{{description_preview}}</p>
      </div>
      <div class="next-steps">
        <p><strong>¿Qué sigue?</strong></p>
        <ol>
          <li>Un abogado revisará tu solicitud</li>
          <li>Te contactaremos para aclarar detalles si es necesario</li>
          <li>Recibirás una cotización personalizada</li>
          <li>Una vez aprobada, prepararemos tu documento</li>
        </ol>
      </div>
      <p>Tiempo estimado de respuesta: <strong>24-72 horas hábiles</strong> según la complejidad.</p>
      <p>Gracias por confiar en nosotros.</p>
      <p>Saludos cordiales,<br>El equipo de Tu Consultor Legal</p>
    </div>
    <div class="footer">
      <p>© {{current_year}} Tu Consultor Legal. Todos los derechos reservados.</p>
      <p><a href="{{site_url}}" style="color: #0372E8;">www.tuconsultorlegal.co</a></p>
    </div>
  </div>
</body>
</html>',
  true,
  '["user_name", "document_type", "urgency", "urgency_class", "description_preview", "site_url", "current_year"]'::jsonb
);

-- Insertar plantilla de confirmación de observaciones enviadas
INSERT INTO email_templates (template_key, template_name, subject, html_body, is_active, variables)
VALUES (
  'user_observations_confirmation',
  'Confirmación de Observaciones Enviadas - Usuario',
  'Tus observaciones han sido enviadas: {{document_type}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #0372E8 0%, #0056b3 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; color: #333; line-height: 1.6; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .observations-preview { background: #fff8e1; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #ffc107; }
    .btn { display: inline-block; background: #0372E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📝 Observaciones Recibidas</h1>
    </div>
    <div class="content">
      <p>Hola <strong>{{user_name}}</strong>,</p>
      <p>Hemos recibido correctamente tus observaciones para el documento:</p>
      <div class="info-box">
        <p><strong>Documento:</strong> {{document_type}}</p>
        <p><strong>Código de seguimiento:</strong> {{tracking_code}}</p>
        <p><strong>Fecha de envío:</strong> {{observation_date}}</p>
      </div>
      <p><strong>Tus observaciones:</strong></p>
      <div class="observations-preview">{{observations_preview}}</div>
      <p>El abogado revisará tus comentarios y realizará los ajustes necesarios. Te notificaremos cuando el documento actualizado esté listo para tu revisión.</p>
      <p style="text-align: center; margin-top: 25px;">
        <a href="{{document_url}}" class="btn">Ver Estado del Documento</a>
      </p>
      <p>Gracias por tu retroalimentación.</p>
      <p>Saludos cordiales,<br>El equipo de Tu Consultor Legal</p>
    </div>
    <div class="footer">
      <p>© {{current_year}} Tu Consultor Legal. Todos los derechos reservados.</p>
      <p><a href="{{site_url}}" style="color: #0372E8;">www.tuconsultorlegal.co</a></p>
    </div>
  </div>
</body>
</html>',
  true,
  '["user_name", "document_type", "tracking_code", "observation_date", "observations_preview", "document_url", "site_url", "current_year"]'::jsonb
);