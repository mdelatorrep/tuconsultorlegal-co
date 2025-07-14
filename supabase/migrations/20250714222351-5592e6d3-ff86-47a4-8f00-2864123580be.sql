-- Insert initial n8n service record
INSERT INTO public.service_status (service_name, status)
VALUES ('n8n', 'unknown')
ON CONFLICT (service_name) DO NOTHING;