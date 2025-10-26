-- Create table for custom document requests
CREATE TABLE public.custom_document_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.custom_document_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own requests
CREATE POLICY "Users can create document requests"
ON public.custom_document_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can view their own requests
CREATE POLICY "Users can view their own requests"
ON public.custom_document_requests
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.custom_document_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE admin_profiles.user_id = auth.uid()
    AND admin_profiles.active = true
  )
);

-- Admins can update all requests
CREATE POLICY "Admins can update requests"
ON public.custom_document_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE admin_profiles.user_id = auth.uid()
    AND admin_profiles.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE admin_profiles.user_id = auth.uid()
    AND admin_profiles.active = true
  )
);

-- Service role can manage all requests
CREATE POLICY "Service role can manage custom document requests"
ON public.custom_document_requests
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create trigger to update updated_at
CREATE TRIGGER update_custom_document_requests_updated_at
BEFORE UPDATE ON public.custom_document_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_custom_document_requests_user_id ON public.custom_document_requests(user_id);
CREATE INDEX idx_custom_document_requests_status ON public.custom_document_requests(status);
CREATE INDEX idx_custom_document_requests_created_at ON public.custom_document_requests(created_at DESC);