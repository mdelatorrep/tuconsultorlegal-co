-- Add trigger to automatically issue certificates
CREATE TRIGGER issue_certificate_trigger
BEFORE UPDATE ON public.lawyer_training_progress
FOR EACH ROW
EXECUTE FUNCTION public.issue_certificate_on_completion();