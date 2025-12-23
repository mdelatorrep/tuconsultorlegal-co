-- Create lawyer_verifications table to track Verifik API verifications
CREATE TABLE public.lawyer_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('professional_status', 'certificate_validity', 'process_lookup')),
  document_type TEXT,
  document_number TEXT,
  verifik_response JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'not_found', 'expired', 'error')),
  professional_name TEXT,
  bar_number TEXT,
  professional_status TEXT,
  specialization TEXT,
  certificate_expiry_date TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  api_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create verifik_api_usage table to track API consumption and costs
CREATE TABLE public.verifik_api_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES public.lawyer_profiles(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  request_params JSONB,
  response_status INTEGER,
  response_data JSONB,
  api_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX idx_lawyer_verifications_lawyer_id ON public.lawyer_verifications(lawyer_id);
CREATE INDEX idx_lawyer_verifications_status ON public.lawyer_verifications(status);
CREATE INDEX idx_lawyer_verifications_type ON public.lawyer_verifications(verification_type);
CREATE INDEX idx_verifik_api_usage_lawyer_id ON public.verifik_api_usage(lawyer_id);
CREATE INDEX idx_verifik_api_usage_created_at ON public.verifik_api_usage(created_at);

-- Enable RLS
ALTER TABLE public.lawyer_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifik_api_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lawyer_verifications
CREATE POLICY "Lawyers can view their own verifications"
ON public.lawyer_verifications
FOR SELECT
USING (auth.uid() = lawyer_id);

CREATE POLICY "Admins can view all verifications"
ON public.lawyer_verifications
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM admin_profiles
  WHERE admin_profiles.user_id = auth.uid() AND admin_profiles.active = true
));

CREATE POLICY "Admins can manage verifications"
ON public.lawyer_verifications
FOR ALL
USING (EXISTS (
  SELECT 1 FROM admin_profiles
  WHERE admin_profiles.user_id = auth.uid() AND admin_profiles.active = true
));

CREATE POLICY "Service role can manage verifications"
ON public.lawyer_verifications
FOR ALL
USING (auth.role() = 'service_role');

-- RLS Policies for verifik_api_usage
CREATE POLICY "Lawyers can view their own API usage"
ON public.verifik_api_usage
FOR SELECT
USING (auth.uid() = lawyer_id);

CREATE POLICY "Admins can view all API usage"
ON public.verifik_api_usage
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM admin_profiles
  WHERE admin_profiles.user_id = auth.uid() AND admin_profiles.active = true
));

CREATE POLICY "Service role can manage API usage"
ON public.verifik_api_usage
FOR ALL
USING (auth.role() = 'service_role');

-- Add is_verified column to lawyer_profiles if not exists
ALTER TABLE public.lawyer_profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bar_number TEXT,
ADD COLUMN IF NOT EXISTS professional_status TEXT;

-- Trigger to update updated_at
CREATE TRIGGER update_lawyer_verifications_updated_at
BEFORE UPDATE ON public.lawyer_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();