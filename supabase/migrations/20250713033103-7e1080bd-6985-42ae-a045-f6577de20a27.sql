-- Create table for service status monitoring
CREATE TABLE public.service_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'unknown', -- 'operational', 'degraded', 'outage', 'unknown'
  last_checked timestamp with time zone DEFAULT now(),
  response_time_ms integer,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_status ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (needed for homepage)
CREATE POLICY "Anyone can view service status"
ON public.service_status
FOR SELECT
USING (true);

-- Create policy for service role to manage status
CREATE POLICY "Service role can manage status"
ON public.service_status
FOR ALL
USING (true);

-- Insert initial OpenAI service record
INSERT INTO public.service_status (service_name, status)
VALUES ('openai', 'unknown');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_service_status_updated_at
BEFORE UPDATE ON public.service_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();