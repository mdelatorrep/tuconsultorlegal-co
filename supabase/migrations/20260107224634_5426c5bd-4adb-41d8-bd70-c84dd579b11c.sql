-- Fix signup failure: DB triggers/functions call a non-existent signature of extensions.http_post.
-- In this project, the correct async HTTP helper is pg_net's net.http_post(url, body, params, headers, timeout_milliseconds).

-- Ensure pg_net is available (no-op if already installed)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Ensure net schema is usable
GRANT USAGE ON SCHEMA net TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO anon, authenticated, service_role;

-- 1) notify_document_status_change
CREATE OR REPLACE FUNCTION public.notify_document_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  request_id BIGINT;
BEGIN
  -- Solo notificar si el estado cambió
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Usar pg_net para llamar al edge function de forma asíncrona
    BEGIN
      SELECT net.http_post(
        url := 'https://tkaezookvtpulfpaffes.supabase.co/functions/v1/notify-document-status-change',
        body := jsonb_build_object(
          'document_token_id', NEW.id,
          'new_status', NEW.status,
          'old_status', OLD.status
        ),
        params := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('request.jwt.claim.sub', true)
        ),
        timeout_milliseconds := 10000
      ) INTO request_id;

      RAISE LOG '[NOTIFICATION] Notification triggered for document % - status changed from % to % (request_id: %)',
        NEW.id, OLD.status, NEW.status, request_id;
    EXCEPTION WHEN OTHERS THEN
      -- Log error pero no fallar la transacción principal
      RAISE WARNING '[NOTIFICATION] Error sending notification for document %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) send_lawyer_welcome_email
CREATE OR REPLACE FUNCTION public.send_lawyer_welcome_email()
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

        -- Llamar al edge function send-email usando pg_net (sin autenticación porque verify_jwt = false)
        SELECT net.http_post(
          url := base_url || '/functions/v1/send-email',
          body := jsonb_build_object(
            'to', NEW.email,
            'subject', email_subject,
            'html', email_html,
            'template_key', 'lawyer_welcome',
            'recipient_type', 'lawyer'
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

-- 3) send_user_welcome_email
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

-- 4) notify_lawyer_new_lead
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
  -- Create in-app notification first
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

-- 5) issue_certificate_on_completion
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
    -- Only trigger when completion percentage reaches 100% and is_certified becomes true
    IF NEW.completion_percentage >= 100.00 AND NEW.is_certified = true AND (OLD.is_certified IS NULL OR OLD.is_certified = false) THEN
        -- Get lawyer information from lawyer_profiles
        SELECT lp.full_name, lp.email
        INTO lawyer_info
        FROM lawyer_profiles lp
        WHERE lp.id = NEW.lawyer_id;

        -- Generate unique certificate code
        cert_code := 'IALC-' || to_char(now(), 'YYYY') || '-' || substr(md5(random()::text), 1, 8);

        -- Set certificate_id in training progress
        NEW.certificate_id := cert_code;

        -- Insert certificate record
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
            'Certificación IA Lawyer Fundamentals - tuconsultorlegal.co',
            cert_code,
            'https://tuconsultorlegal.co/certificacion/' || cert_code,
            'https://www.linkedin.com/sharing/share-offsite/?url=https://tuconsultorlegal.co/certificacion/' || cert_code
        );

        RAISE LOG 'Certificate issued for lawyer: % with code: %', lawyer_info.full_name, cert_code;

        -- Send certification email notification
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
            email_html := REPLACE(email_html, '{{verification_url}}', 'https://tuconsultorlegal.co/certificacion/' || cert_code);
            email_html := REPLACE(email_html, '{{linkedin_url}}', 'https://www.linkedin.com/sharing/share-offsite/?url=https://tuconsultorlegal.co/certificacion/' || cert_code);
            email_html := REPLACE(email_html, '{{site_url}}', 'https://tuconsultorlegal.co');
            email_html := REPLACE(email_html, '{{current_year}}', EXTRACT(YEAR FROM NOW())::TEXT);

            -- Call send-email edge function
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