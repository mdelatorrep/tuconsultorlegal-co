-- Función para enviar correo de bienvenida cuando el usuario persona confirma su email
CREATE OR REPLACE FUNCTION public.send_user_welcome_email()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
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
    
    -- Verificar si el usuario es una persona (no abogado)
    -- Asumimos que si no existe en lawyer_profiles, es un usuario persona
    IF NOT EXISTS (SELECT 1 FROM public.lawyer_profiles WHERE id = NEW.id) THEN
      
      -- Obtener la plantilla de bienvenida para usuarios
      SELECT * INTO template_record
      FROM public.email_templates
      WHERE template_key = 'user_welcome'
      AND is_active = true
      LIMIT 1;
      
      IF FOUND THEN
        -- Preparar variables
        base_url := 'https://tuconsultorlegal.co';
        dashboard_url := base_url || '/';
        current_year := EXTRACT(YEAR FROM NOW())::TEXT;
        
        -- Obtener el nombre del usuario desde los metadatos
        -- Reemplazar variables en la plantilla
        email_subject := template_record.subject;
        email_subject := REPLACE(email_subject, '{{user_name}}', COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'));
        email_subject := REPLACE(email_subject, '{{current_year}}', current_year);
        
        email_html := template_record.html_body;
        email_html := REPLACE(email_html, '{{user_name}}', COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'));
        email_html := REPLACE(email_html, '{{dashboard_url}}', dashboard_url);
        email_html := REPLACE(email_html, '{{current_year}}', current_year);
        email_html := REPLACE(email_html, '{{site_url}}', base_url);
        
        -- Llamar al edge function send-email usando pg_net
        SELECT extensions.http_post(
          url := 'https://tkaezookvtpulfpaffes.supabase.co/functions/v1/send-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json'
          ),
          body := jsonb_build_object(
            'to', NEW.email,
            'subject', email_subject,
            'html', email_html,
            'template_key', 'user_welcome',
            'recipient_type', 'user'
          )
        ) INTO request_id;
        
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear el trigger en la tabla auth.users para usuarios personas
DROP TRIGGER IF EXISTS on_user_email_confirmed ON auth.users;
CREATE TRIGGER on_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.send_user_welcome_email();