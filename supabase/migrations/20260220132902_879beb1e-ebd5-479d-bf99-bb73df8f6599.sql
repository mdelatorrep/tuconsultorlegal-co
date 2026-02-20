
-- Update send_user_welcome_email to use praxis-hub.co
CREATE OR REPLACE FUNCTION public.send_user_welcome_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.lawyer_profiles WHERE id = NEW.id) THEN
      SELECT * INTO template_record
      FROM public.email_templates
      WHERE template_key = 'user_welcome'
      AND is_active = true
      LIMIT 1;

      IF FOUND THEN
        base_url := 'https://praxis-hub.co';
        dashboard_url := base_url || '/';
        current_year := EXTRACT(YEAR FROM NOW())::TEXT;

        email_subject := template_record.subject;
        email_subject := REPLACE(email_subject, '{{user_name}}', COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'));
        email_subject := REPLACE(email_subject, '{{current_year}}', current_year);

        email_html := template_record.html_body;
        email_html := REPLACE(email_html, '{{user_name}}', COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'));
        email_html := REPLACE(email_html, '{{dashboard_url}}', dashboard_url);
        email_html := REPLACE(email_html, '{{current_year}}', current_year);
        email_html := REPLACE(email_html, '{{site_url}}', base_url);

        SELECT net.http_post(
          url := 'https://tkaezookvtpulfpaffes.supabase.co/functions/v1/send-email',
          body := jsonb_build_object(
            'to', NEW.email,
            'subject', email_subject,
            'html', email_html,
            'template_key', 'user_welcome',
            'recipient_type', 'user'
          ),
          params := '{}'::jsonb,
          headers := jsonb_build_object(
            'Content-Type', 'application/json'
          ),
          timeout_milliseconds := 10000
        ) INTO request_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update notify_lawyer_new_lead to use praxis-hub.co
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
  PERFORM create_lawyer_notification(
    NEW.lawyer_id,
    'new_lead',
    '🎯 Nuevo Lead Recibido',
    NEW.name || ' quiere contactarte: "' || LEFT(NEW.message, 100) || CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END || '"',
    'lead',
    NEW.id,
    '/crm',
    'high'
  );

  SELECT * INTO lawyer_profile
  FROM public.lawyer_profiles
  WHERE id = NEW.lawyer_id;

  IF FOUND THEN
    SELECT * INTO template_record
    FROM public.email_templates
    WHERE template_key = 'lawyer_new_lead'
    AND is_active = true
    LIMIT 1;

    IF FOUND THEN
      base_url := 'https://praxis-hub.co';
      dashboard_url := base_url || '/#abogados?view=crm';
      current_year := EXTRACT(YEAR FROM NOW())::TEXT;

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

      BEGIN
        SELECT net.http_post(
          url := 'https://tkaezookvtpulfpaffes.supabase.co/functions/v1/send-email',
          body := jsonb_build_object(
            'to', lawyer_profile.email,
            'subject', email_subject,
            'html', email_html,
            'template_key', 'lawyer_new_lead',
            'recipient_type', 'lawyer'
          ),
          params := '{}'::jsonb,
          headers := jsonb_build_object(
            'Content-Type', 'application/json'
          ),
          timeout_milliseconds := 10000
        ) INTO request_id;

        RAISE LOG 'Lead notification email queued for lawyer: % (request_id: %)', lawyer_profile.full_name, request_id;
      EXCEPTION WHEN OTHERS THEN
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

-- Update issue_certificate_on_completion to use praxis-hub.co
CREATE OR REPLACE FUNCTION public.issue_certificate_on_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    lawyer_info RECORD;
    cert_code TEXT;
    template_record RECORD;
    email_subject TEXT;
    email_html TEXT;
    request_id BIGINT;
BEGIN
    IF NEW.completion_percentage >= 100.00 AND NEW.is_certified = true AND (OLD.is_certified IS NULL OR OLD.is_certified = false) THEN
        SELECT lp.full_name, lp.email
        INTO lawyer_info
        FROM lawyer_profiles lp
        WHERE lp.id = NEW.lawyer_id;

        cert_code := 'IALC-' || to_char(now(), 'YYYY') || '-' || substr(md5(random()::text), 1, 8);
        NEW.certificate_id := cert_code;

        INSERT INTO public.lawyer_certificates (
            lawyer_id,
            certificate_type,
            certificate_name,
            certificate_code,
            verification_url,
            linkedin_share_url
        ) VALUES (
            NEW.lawyer_id,
            'ai_lawyer_fundamentals',
            'Certificación IA Lawyer Fundamentals - praxis-hub.co',
            cert_code,
            'https://praxis-hub.co/certificacion/' || cert_code,
            'https://www.linkedin.com/sharing/share-offsite/?url=https://praxis-hub.co/certificacion/' || cert_code
        );

        RAISE LOG 'Certificate issued for lawyer: % with code: %', lawyer_info.full_name, cert_code;

        SELECT * INTO template_record
        FROM public.email_templates
        WHERE template_key = 'lawyer_certification_completed'
        AND is_active = true
        LIMIT 1;

        IF FOUND THEN
            email_subject := template_record.subject;
            email_subject := REPLACE(email_subject, '{{lawyer_name}}', lawyer_info.full_name);
            email_subject := REPLACE(email_subject, '{{certificate_code}}', cert_code);

            email_html := template_record.html_body;
            email_html := REPLACE(email_html, '{{lawyer_name}}', lawyer_info.full_name);
            email_html := REPLACE(email_html, '{{certificate_code}}', cert_code);
            email_html := REPLACE(email_html, '{{verification_url}}', 'https://praxis-hub.co/certificacion/' || cert_code);
            email_html := REPLACE(email_html, '{{linkedin_url}}', 'https://www.linkedin.com/sharing/share-offsite/?url=https://praxis-hub.co/certificacion/' || cert_code);
            email_html := REPLACE(email_html, '{{site_url}}', 'https://praxis-hub.co');
            email_html := REPLACE(email_html, '{{current_year}}', EXTRACT(YEAR FROM NOW())::TEXT);

            BEGIN
                SELECT net.http_post(
                    url := 'https://tkaezookvtpulfpaffes.supabase.co/functions/v1/send-email',
                    body := jsonb_build_object(
                        'to', lawyer_info.email,
                        'subject', email_subject,
                        'html', email_html,
                        'template_key', 'lawyer_certification_completed',
                        'recipient_type', 'lawyer'
                    ),
                    params := '{}'::jsonb,
                    headers := jsonb_build_object('Content-Type', 'application/json'),
                    timeout_milliseconds := 10000
                ) INTO request_id;

                RAISE LOG 'Certification email queued for lawyer: % (request_id: %)', lawyer_info.full_name, request_id;
            EXCEPTION WHEN OTHERS THEN
                RAISE LOG 'Error sending certification email: %', SQLERRM;
            END;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- Also update the email_templates table if it has www.tuconsultorlegal.co references in html_body
UPDATE public.email_templates 
SET html_body = REPLACE(html_body, 'tuconsultorlegal.co', 'praxis-hub.co'),
    updated_at = now()
WHERE html_body LIKE '%tuconsultorlegal.co%';

-- Update email_templates subject if needed
UPDATE public.email_templates 
SET subject = REPLACE(subject, 'tuconsultorlegal.co', 'praxis-hub.co'),
    updated_at = now()
WHERE subject LIKE '%tuconsultorlegal.co%';

-- Update email_configuration table
UPDATE public.email_configuration
SET smtp_user = REPLACE(smtp_user, 'tuconsultorlegal.co', 'praxis-hub.co'),
    smtp_from_email = REPLACE(smtp_from_email, 'tuconsultorlegal.co', 'praxis-hub.co'),
    updated_at = now()
WHERE smtp_user LIKE '%tuconsultorlegal.co%' OR smtp_from_email LIKE '%tuconsultorlegal.co%';

-- Update system_config if there are any tuconsultorlegal.co references
UPDATE public.system_config
SET config_value = REPLACE(config_value, 'tuconsultorlegal.co', 'praxis-hub.co'),
    updated_at = now()
WHERE config_value LIKE '%tuconsultorlegal.co%';
