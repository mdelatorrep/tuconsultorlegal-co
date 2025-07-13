-- Create table to track pricing plan clicks
CREATE TABLE public.pricing_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  plan_type TEXT NOT NULL, -- 'personal' or 'business'
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pricing_analytics ENABLE ROW LEVEL SECURITY;

-- Create policy for edge functions to insert analytics
CREATE POLICY "insert_pricing_analytics" ON public.pricing_analytics
FOR INSERT
WITH CHECK (true);

-- Create policy for service role to view all analytics
CREATE POLICY "view_pricing_analytics" ON public.pricing_analytics
FOR SELECT
USING (true);

-- Create index for better performance on queries
CREATE INDEX idx_pricing_analytics_plan_id ON public.pricing_analytics(plan_id);
CREATE INDEX idx_pricing_analytics_clicked_at ON public.pricing_analytics(clicked_at);
CREATE INDEX idx_pricing_analytics_plan_type ON public.pricing_analytics(plan_type);