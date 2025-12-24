-- Trigger function for low credit balance notifications
CREATE OR REPLACE FUNCTION public.notify_low_credit_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  low_balance_threshold INTEGER := 5;
BEGIN
  -- Only trigger on balance decrease below threshold
  IF NEW.current_balance < low_balance_threshold 
     AND (OLD.current_balance IS NULL OR OLD.current_balance >= low_balance_threshold) THEN
    
    -- Create in-app notification using the function
    PERFORM create_lawyer_notification(
      NEW.lawyer_id,
      'credit_low',
      '⚠️ Créditos Bajos',
      'Tu balance de créditos está por debajo de ' || low_balance_threshold || '. Recarga para seguir usando las herramientas de IA.',
      'credit',
      NULL,
      '/credits',
      'high'
    );
    
    RAISE LOG '[NOTIFICATION] Low credit alert sent to lawyer: % (balance: %)', NEW.lawyer_id, NEW.current_balance;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for low credit notifications
DROP TRIGGER IF EXISTS trigger_low_credit_notification ON public.lawyer_credits;
CREATE TRIGGER trigger_low_credit_notification
AFTER UPDATE OF current_balance ON public.lawyer_credits
FOR EACH ROW
EXECUTE FUNCTION public.notify_low_credit_balance();

-- Trigger function for credit recharge notifications  
CREATE OR REPLACE FUNCTION public.notify_credit_recharge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only for purchase or admin_grant transactions with positive amounts
  IF NEW.transaction_type IN ('purchase', 'admin_grant', 'referral_bonus', 'gamification') 
     AND NEW.amount > 0 THEN
    
    PERFORM create_lawyer_notification(
      NEW.lawyer_id,
      'credit_recharge',
      '✅ Créditos Recibidos',
      'Has recibido ' || NEW.amount || ' créditos. ' || COALESCE(NEW.description, 'Balance actual: ' || NEW.balance_after),
      'credit',
      NEW.id,
      '/credits',
      'normal'
    );
    
    RAISE LOG '[NOTIFICATION] Credit recharge notification sent to lawyer: % (amount: %)', NEW.lawyer_id, NEW.amount;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for credit recharge notifications
DROP TRIGGER IF EXISTS trigger_credit_recharge_notification ON public.credit_transactions;
CREATE TRIGGER trigger_credit_recharge_notification
AFTER INSERT ON public.credit_transactions
FOR EACH ROW
EXECUTE FUNCTION public.notify_credit_recharge();

-- Trigger function for SLA alerts on documents
CREATE OR REPLACE FUNCTION public.notify_sla_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lawyer_id UUID;
BEGIN
  -- Only trigger when sla_status changes to at_risk or overdue
  IF (NEW.sla_status = 'at_risk' AND (OLD.sla_status IS NULL OR OLD.sla_status = 'on_time'))
     OR (NEW.sla_status = 'overdue' AND (OLD.sla_status IS NULL OR OLD.sla_status != 'overdue')) THEN
    
    -- Get the lawyer who created the agent for this document
    SELECT la.created_by INTO v_lawyer_id
    FROM legal_agents la
    WHERE la.name ILIKE '%' || NEW.document_type || '%'
       OR NEW.document_type ILIKE '%' || la.name || '%'
    LIMIT 1;
    
    IF v_lawyer_id IS NOT NULL THEN
      IF NEW.sla_status = 'overdue' THEN
        PERFORM create_lawyer_notification(
          v_lawyer_id,
          'sla_alert',
          '🚨 Documento Vencido',
          'El documento "' || NEW.document_type || '" para ' || COALESCE(NEW.user_name, 'cliente anónimo') || ' ha superado el tiempo de respuesta.',
          'document',
          NEW.id,
          '/dashboard',
          'urgent'
        );
      ELSE
        PERFORM create_lawyer_notification(
          v_lawyer_id,
          'sla_alert',
          '⚠️ Documento en Riesgo',
          'El documento "' || NEW.document_type || '" para ' || COALESCE(NEW.user_name, 'cliente anónimo') || ' está próximo a vencer. Deadline: ' || to_char(NEW.sla_deadline, 'DD/MM HH24:MI'),
          'document',
          NEW.id,
          '/dashboard',
          'high'
        );
      END IF;
      
      RAISE LOG '[NOTIFICATION] SLA alert sent for document % (status: %)', NEW.id, NEW.sla_status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for SLA alerts
DROP TRIGGER IF EXISTS trigger_sla_alert ON public.document_tokens;
CREATE TRIGGER trigger_sla_alert
AFTER UPDATE OF sla_status ON public.document_tokens
FOR EACH ROW
EXECUTE FUNCTION public.notify_sla_alert();

-- Update existing trigger to also create in-app notification for new leads
CREATE OR REPLACE FUNCTION public.notify_lawyer_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
$$;