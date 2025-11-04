-- Habilitar la extensión pg_net si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Recrear la función para notificar al abogado sobre nuevos leads
-- con mejor manejo de errores
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
      
      -- Intentar llamar al edge function send-email usando pg_net
      BEGIN
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
      EXCEPTION WHEN OTHERS THEN
        -- Log el error pero no fallar el insert
        RAISE LOG 'Error sending lead notification email: %', SQLERRM;
      END;
    ELSE
      RAISE LOG 'Email template lawyer_new_lead not found';
    END IF;
  ELSE
    RAISE LOG 'Lawyer profile not found for id: %', NEW.lawyer_id;
  END IF;
  
  RETURN NEW;
END;
$function$;