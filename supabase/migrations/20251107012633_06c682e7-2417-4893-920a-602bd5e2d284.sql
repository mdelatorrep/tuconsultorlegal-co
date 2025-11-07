-- Mejorar el trigger de notificaciones para usar URL directa y corregir problemas

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS document_status_change_trigger ON public.document_tokens;
DROP FUNCTION IF EXISTS public.notify_document_status_change();

-- Recrear función mejorada con URL directa de producción
CREATE OR REPLACE FUNCTION public.notify_document_status_change()
RETURNS TRIGGER AS $$
DECLARE
  request_id BIGINT;
BEGIN
  -- Solo notificar si el estado cambió
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Usar pg_net para llamar al edge function de forma asíncrona
    BEGIN
      SELECT extensions.http_post(
        url := 'https://tkaezookvtpulfpaffes.supabase.co/functions/v1/notify-document-status-change',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('request.jwt.claim.sub', true)
        ),
        body := jsonb_build_object(
          'document_token_id', NEW.id,
          'new_status', NEW.status,
          'old_status', OLD.status
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recrear trigger
CREATE TRIGGER document_status_change_trigger
  AFTER UPDATE ON public.document_tokens
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_document_status_change();

-- Comentario explicativo
COMMENT ON FUNCTION public.notify_document_status_change() IS 
'Trigger function that sends email notifications when a document status changes. 
Uses pg_net to call the notify-document-status-change edge function asynchronously.';

-- Verificar que pg_net esté habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) THEN
    CREATE EXTENSION pg_net WITH SCHEMA extensions;
    RAISE NOTICE '[SETUP] pg_net extension enabled';
  ELSE
    RAISE NOTICE '[SETUP] pg_net extension already enabled';
  END IF;
END $$;