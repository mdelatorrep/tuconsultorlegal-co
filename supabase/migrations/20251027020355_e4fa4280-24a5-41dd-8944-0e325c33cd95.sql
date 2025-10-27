-- Habilitar la extensión pg_net si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Actualizar la función para que realmente envíe el correo usando pg_net
CREATE OR REPLACE FUNCTION public.send_lawyer_welcome_email()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Solo procesar si el email fue confirmado (cambió de null a una fecha)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    
    -- Verificar si el usuario es un abogado
    SELECT * INTO lawyer_profile
    FROM public.lawyer_profiles
    WHERE id = NEW.id;
    
    IF FOUND THEN
      -- Obtener la plantilla de bienvenida
      SELECT * INTO template_record
      FROM public.email_templates
      WHERE template_key = 'lawyer_welcome'
      AND is_active = true
      LIMIT 1;
      
      IF FOUND THEN
        -- Preparar variables
        base_url := 'https://tkaezookvtpulfpaffes.supabase.co';
        dashboard_url := base_url || '/#abogados';
        current_year := EXTRACT(YEAR FROM NOW())::TEXT;
        
        -- Reemplazar variables en la plantilla
        email_subject := template_record.subject;
        email_subject := REPLACE(email_subject, '{{lawyer_name}}', lawyer_profile.full_name);
        email_subject := REPLACE(email_subject, '{{current_year}}', current_year);
        
        email_html := template_record.html_body;
        email_html := REPLACE(email_html, '{{lawyer_name}}', lawyer_profile.full_name);
        email_html := REPLACE(email_html, '{{dashboard_url}}', dashboard_url);
        email_html := REPLACE(email_html, '{{current_year}}', current_year);
        email_html := REPLACE(email_html, '{{site_url}}', base_url);
        
        -- Llamar al edge function send-email usando pg_net
        SELECT extensions.http_post(
          url := base_url || '/functions/v1/send-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'to', NEW.email,
            'subject', email_subject,
            'html', email_html,
            'template_key', 'lawyer_welcome',
            'recipient_type', 'lawyer'
          )
        ) INTO request_id;
        
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;