
-- 1. Create admin notification email template
INSERT INTO public.email_templates (template_key, template_name, subject, html_body, variables, is_active)
VALUES (
  'admin_new_lawyer_registration',
  'Notificación Admin - Nuevo Abogado',
  '🆕 Nuevo abogado registrado: {{lawyer_name}}',
  '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #0372e8 0%, #0563c9 100%); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 22px; }
    .content { padding: 30px; color: #333; line-height: 1.6; }
    .content h2 { color: #0372e8; margin: 0 0 16px 0; font-size: 20px; }
    .info-box { background: #f0f7ff; border-left: 4px solid #0372e8; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .info-box p { margin: 6px 0; font-size: 14px; }
    .info-box strong { color: #333; }
    .button { background: #0372e8; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; }
    .footer p { color: #6c757d; font-size: 12px; margin: 4px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚖️ Praxis Hub - Admin</h1>
    </div>
    <div class="content">
      <h2>🆕 Nuevo Abogado Registrado</h2>
      <p>Se ha registrado un nuevo abogado en la plataforma:</p>
      <div class="info-box">
        <p><strong>Nombre:</strong> {{lawyer_name}}</p>
        <p><strong>Email:</strong> {{lawyer_email}}</p>
        <p><strong>Fecha:</strong> {{registration_date}}</p>
      </div>
      <p>Puedes revisar y gestionar sus permisos desde el panel de administración.</p>
      <center>
        <a href="{{admin_url}}" class="button">Ir al Panel Admin</a>
      </center>
    </div>
    <div class="footer">
      <p>© {{current_year}} Praxis Hub - Notificación Interna</p>
    </div>
  </div>
</body>
</html>',
  '["lawyer_name", "lawyer_email", "registration_date", "admin_url", "current_year"]'::jsonb,
  true
);

-- 2. Update send_lawyer_welcome_email to also notify admin
CREATE OR REPLACE FUNCTION public.send_lawyer_welcome_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lawyer_profile RECORD;
  template_record RECORD;
  admin_template RECORD;
  email_subject TEXT;
  email_html TEXT;
  admin_subject TEXT;
  admin_html TEXT;
  base_url TEXT;
  dashboard_url TEXT;
  admin_url TEXT;
  current_year TEXT;
  registration_date TEXT;
  request_id BIGINT;
  admin_email TEXT;
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    SELECT * INTO lawyer_profile
    FROM public.lawyer_profiles
    WHERE id = NEW.id;

    IF FOUND THEN
      base_url := 'https://praxis-hub.co';
      dashboard_url := base_url || '/#abogados';
      admin_url := base_url || '/#admin';
      current_year := EXTRACT(YEAR FROM NOW())::TEXT;
      registration_date := to_char(NOW() AT TIME ZONE 'America/Bogota', 'DD/MM/YYYY HH24:MI');

      -- === WELCOME EMAIL TO LAWYER ===
      SELECT * INTO template_record
      FROM public.email_templates
      WHERE template_key = 'lawyer_welcome' AND is_active = true
      LIMIT 1;

      IF FOUND THEN
        email_subject := REPLACE(template_record.subject, '{{lawyer_name}}', lawyer_profile.full_name);
        email_subject := REPLACE(email_subject, '{{current_year}}', current_year);
        email_html := template_record.html_body;
        email_html := REPLACE(email_html, '{{lawyer_name}}', lawyer_profile.full_name);
        email_html := REPLACE(email_html, '{{dashboard_url}}', dashboard_url);
        email_html := REPLACE(email_html, '{{current_year}}', current_year);
        email_html := REPLACE(email_html, '{{site_url}}', base_url);

        BEGIN
          SELECT net.http_post(
            url := 'https://tkaezookvtpulfpaffes.supabase.co/functions/v1/send-email',
            body := jsonb_build_object('to', NEW.email, 'subject', email_subject, 'html', email_html, 'template_key', 'lawyer_welcome', 'recipient_type', 'lawyer'),
            params := '{}'::jsonb,
            headers := jsonb_build_object('Content-Type', 'application/json'),
            timeout_milliseconds := 10000
          ) INTO request_id;
        EXCEPTION WHEN OTHERS THEN
          RAISE LOG '[EMAIL] Error sending welcome email to %: %', NEW.email, SQLERRM;
        END;
      END IF;

      -- === ADMIN NOTIFICATION ===
      SELECT * INTO admin_template
      FROM public.email_templates
      WHERE template_key = 'admin_new_lawyer_registration' AND is_active = true
      LIMIT 1;

      SELECT ap.email INTO admin_email
      FROM public.admin_profiles ap
      WHERE ap.active = true
      LIMIT 1;

      IF admin_template IS NOT NULL AND admin_email IS NOT NULL THEN
        admin_subject := REPLACE(admin_template.subject, '{{lawyer_name}}', lawyer_profile.full_name);
        admin_html := admin_template.html_body;
        admin_html := REPLACE(admin_html, '{{lawyer_name}}', lawyer_profile.full_name);
        admin_html := REPLACE(admin_html, '{{lawyer_email}}', NEW.email);
        admin_html := REPLACE(admin_html, '{{registration_date}}', registration_date);
        admin_html := REPLACE(admin_html, '{{admin_url}}', admin_url);
        admin_html := REPLACE(admin_html, '{{current_year}}', current_year);

        BEGIN
          SELECT net.http_post(
            url := 'https://tkaezookvtpulfpaffes.supabase.co/functions/v1/send-email',
            body := jsonb_build_object('to', admin_email, 'subject', admin_subject, 'html', admin_html, 'template_key', 'admin_new_lawyer_registration', 'recipient_type', 'admin'),
            params := '{}'::jsonb,
            headers := jsonb_build_object('Content-Type', 'application/json'),
            timeout_milliseconds := 10000
          ) INTO request_id;
          RAISE LOG '[EMAIL] Admin notified of new lawyer: % (to: %)', lawyer_profile.full_name, admin_email;
        EXCEPTION WHEN OTHERS THEN
          RAISE LOG '[EMAIL] Error notifying admin about new lawyer %: %', NEW.email, SQLERRM;
        END;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
