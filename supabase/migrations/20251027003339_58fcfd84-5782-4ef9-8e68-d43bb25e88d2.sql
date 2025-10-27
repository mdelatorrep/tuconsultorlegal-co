-- Create table for legal content management
CREATE TABLE IF NOT EXISTS public.legal_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_content ENABLE ROW LEVEL SECURITY;

-- Allow public read access to legal content
CREATE POLICY "Anyone can view legal content"
  ON public.legal_content
  FOR SELECT
  USING (true);

-- Allow admins to manage legal content
CREATE POLICY "Admins can manage legal content"
  ON public.legal_content
  FOR ALL
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

-- Service role can manage everything
CREATE POLICY "Service role can manage legal content"
  ON public.legal_content
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_legal_content_page_key ON public.legal_content(page_key);