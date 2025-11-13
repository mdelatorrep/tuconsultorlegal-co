-- Crear trigger para notificaciones automáticas de cambio de estado
-- Este trigger ejecutará la función notify_document_status_change cada vez que se actualice un documento

CREATE TRIGGER trigger_notify_document_status_change
  AFTER UPDATE ON public.document_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_document_status_change();