-- Crear trigger para notificaciones automáticas de cambio de estado

-- Habilitar pg_net si no está habilitado
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Función que se ejecuta cuando cambia el estado de un documento
CREATE OR REPLACE FUNCTION public.notify_document_status_change()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
BEGIN
  -- Solo notificar si el estado cambió
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    function_url := current_setting('app.settings.api_external_url', true) || '/functions/v1/notify-document-status-change';
    
    -- Si no está configurado, usar la URL por defecto
    IF function_url IS NULL OR function_url = '' THEN
      function_url := 'https://tkaezookvtpulfpaffes.supabase.co/functions/v1/notify-document-status-change';
    END IF;

    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'document_token_id', NEW.id,
        'new_status', NEW.status,
        'old_status', OLD.status
      ),
      timeout_milliseconds := 5000
    );
    
    RAISE LOG 'Notification triggered for document % - status changed from % to %', 
      NEW.id, OLD.status, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crear trigger
DROP TRIGGER IF EXISTS document_status_change_trigger ON public.document_tokens;

CREATE TRIGGER document_status_change_trigger
  AFTER UPDATE ON public.document_tokens
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_document_status_change();