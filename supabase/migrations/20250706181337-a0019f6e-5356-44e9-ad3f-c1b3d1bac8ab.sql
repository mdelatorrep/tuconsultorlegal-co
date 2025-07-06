-- Create webhook_logs table for tracking webhook events
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payment_id TEXT,
  order_reference TEXT,
  document_id UUID,
  amount BIGINT,
  status TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for webhook_logs (admin only access)
CREATE POLICY "Admin can view webhook logs" 
ON public.webhook_logs 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_webhook_logs_updated_at
BEFORE UPDATE ON public.webhook_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_webhook_logs_payment_id ON public.webhook_logs(payment_id);
CREATE INDEX idx_webhook_logs_document_id ON public.webhook_logs(document_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at);