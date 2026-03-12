
CREATE TABLE IF NOT EXISTS public.lawyer_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  google_email TEXT,
  calendar_id TEXT DEFAULT 'primary',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lawyer_id)
);

ALTER TABLE public.lawyer_google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lawyers can manage their own Google tokens"
  ON public.lawyer_google_tokens
  FOR ALL
  TO authenticated
  USING (lawyer_id = auth.uid())
  WITH CHECK (lawyer_id = auth.uid());

-- Also add external_calendar_id to legal_calendar_events if not exists
ALTER TABLE public.legal_calendar_events 
  ADD COLUMN IF NOT EXISTS external_calendar_id TEXT;
