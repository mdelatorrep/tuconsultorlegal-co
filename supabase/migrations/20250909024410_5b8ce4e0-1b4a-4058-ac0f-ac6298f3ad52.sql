-- Create lawyer_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.lawyer_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  plan_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  dlocal_subscription_id TEXT UNIQUE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lawyer_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for lawyer_subscriptions
CREATE POLICY "Users can view their own subscriptions" 
ON public.lawyer_subscriptions 
FOR SELECT 
USING (lawyer_id = auth.uid());

CREATE POLICY "Edge functions can manage subscriptions" 
ON public.lawyer_subscriptions 
FOR ALL 
USING (true);

-- Create trigger for updating timestamps
CREATE TRIGGER update_lawyer_subscriptions_updated_at
BEFORE UPDATE ON public.lawyer_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_lawyer_subscriptions_lawyer_id ON public.lawyer_subscriptions(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_subscriptions_status ON public.lawyer_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_lawyer_subscriptions_dlocal_id ON public.lawyer_subscriptions(dlocal_subscription_id);