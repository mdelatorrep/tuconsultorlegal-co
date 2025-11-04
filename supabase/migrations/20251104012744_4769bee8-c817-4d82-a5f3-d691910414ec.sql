-- Crear plantilla de email para notificar al abogado sobre nuevos leads
INSERT INTO public.email_templates (
  template_key,
  template_name,
  subject,
  html_body,
  variables,
  is_active
) VALUES (
  'lawyer_new_lead',
  'Notificación de Nuevo Lead',
  '¡Nueva consulta de {{lead_name}}!',
  '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva Consulta Recibida</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✉️ Nueva Consulta Recibida</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hola <strong>{{lawyer_name}}</strong>,</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">Has recibido una nueva consulta a través de tu perfil público en Tu Consultor Legal:</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h2 style="color: #667eea; margin-top: 0; font-size: 20px;">📋 Detalles del Cliente</h2>
      
      <p style="margin: 10px 0;"><strong>Nombre:</strong> {{lead_name}}</p>
      <p style="margin: 10px 0;"><strong>Email:</strong> <a href="mailto:{{lead_email}}" style="color: #667eea;">{{lead_email}}</a></p>
      {{#if lead_phone}}
      <p style="margin: 10px 0;"><strong>Teléfono:</strong> {{lead_phone}}</p>
      {{/if}}
      
      <h3 style="color: #667eea; margin-top: 20px; margin-bottom: 10px; font-size: 18px;">💬 Mensaje:</h3>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; font-style: italic;">
        {{lead_message}}
      </div>
      
      <p style="margin: 15px 0 5px 0; font-size: 14px; color: #666;">
        <strong>Origen:</strong> {{lead_origin}}
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboard_url}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        Ver en mi Panel CRM
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      💡 <strong>Tip:</strong> Responde rápido para aumentar tus conversiones. Los clientes valoran la atención oportuna.
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 14px; color: #666; text-align: center;">
      Este es un mensaje automático de <strong>Tu Consultor Legal</strong><br>
      <a href="{{site_url}}" style="color: #667eea;">tuconsultorlegal.co</a>
    </p>
    
    <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
      © {{current_year}} Tu Consultor Legal. Todos los derechos reservados.
    </p>
  </div>
</body>
</html>',
  '["lawyer_name", "lead_name", "lead_email", "lead_phone", "lead_message", "lead_origin", "dashboard_url", "site_url", "current_year"]'::jsonb,
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Crear función para notificar al abogado sobre nuevos leads
CREATE OR REPLACE FUNCTION public.notify_lawyer_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  lawyer_profile RECORD;
  template_record RECORD;
  email_subject TEXT;
  email_html TEXT;
  base_url TEXT;
  dashboard_url TEXT;
  current_year TEXT;
  request_id BIGINT;
BEGIN
  -- Obtener información del abogado
  SELECT * INTO lawyer_profile
  FROM public.lawyer_profiles
  WHERE id = NEW.lawyer_id;
  
  IF FOUND THEN
    -- Obtener la plantilla de notificación de nuevo lead
    SELECT * INTO template_record
    FROM public.email_templates
    WHERE template_key = 'lawyer_new_lead'
    AND is_active = true
    LIMIT 1;
    
    IF FOUND THEN
      -- Preparar variables
      base_url := 'https://tuconsultorlegal.co';
      dashboard_url := base_url || '/#abogados?view=crm';
      current_year := EXTRACT(YEAR FROM NOW())::TEXT;
      
      -- Reemplazar variables en la plantilla
      email_subject := template_record.subject;
      email_subject := REPLACE(email_subject, '{{lawyer_name}}', lawyer_profile.full_name);
      email_subject := REPLACE(email_subject, '{{lead_name}}', NEW.name);
      
      email_html := template_record.html_body;
      email_html := REPLACE(email_html, '{{lawyer_name}}', lawyer_profile.full_name);
      email_html := REPLACE(email_html, '{{lead_name}}', NEW.name);
      email_html := REPLACE(email_html, '{{lead_email}}', NEW.email);
      email_html := REPLACE(email_html, '{{lead_phone}}', COALESCE(NEW.phone, 'No proporcionado'));
      email_html := REPLACE(email_html, '{{lead_message}}', NEW.message);
      email_html := REPLACE(email_html, '{{lead_origin}}', NEW.origin);
      email_html := REPLACE(email_html, '{{dashboard_url}}', dashboard_url);
      email_html := REPLACE(email_html, '{{site_url}}', base_url);
      email_html := REPLACE(email_html, '{{current_year}}', current_year);
      
      -- Llamar al edge function send-email usando pg_net
      SELECT extensions.http_post(
        url := 'https://tkaezookvtpulfpaffes.supabase.co/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'to', lawyer_profile.email,
          'subject', email_subject,
          'html', email_html,
          'template_key', 'lawyer_new_lead',
          'recipient_type', 'lawyer'
        )
      ) INTO request_id;
      
      RAISE LOG 'Lead notification email queued for lawyer: % (request_id: %)', lawyer_profile.full_name, request_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Crear trigger para notificar al abogado cuando se crea un nuevo lead
DROP TRIGGER IF EXISTS on_new_lead_notify_lawyer ON public.crm_leads;
CREATE TRIGGER on_new_lead_notify_lawyer
  AFTER INSERT ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lawyer_new_lead();