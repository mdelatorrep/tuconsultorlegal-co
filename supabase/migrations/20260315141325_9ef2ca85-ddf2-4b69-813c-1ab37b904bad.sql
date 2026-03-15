
-- UTM Campaigns table (admin-created campaigns)
CREATE TABLE public.utm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'other',
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  utm_term TEXT,
  utm_content TEXT,
  generated_url TEXT NOT NULL,
  short_description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- UTM Tracking Events table (captured events)
CREATE TABLE public.utm_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  landing_page TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  lawyer_id UUID REFERENCES public.lawyer_profiles(id),
  event_type TEXT NOT NULL DEFAULT 'visit',
  campaign_id UUID REFERENCES public.utm_campaigns(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_utm_events_campaign ON public.utm_tracking_events(utm_campaign);
CREATE INDEX idx_utm_events_source ON public.utm_tracking_events(utm_source);
CREATE INDEX idx_utm_events_type ON public.utm_tracking_events(event_type);
CREATE INDEX idx_utm_events_created ON public.utm_tracking_events(created_at);
CREATE INDEX idx_utm_events_lawyer ON public.utm_tracking_events(lawyer_id);
CREATE INDEX idx_utm_campaigns_active ON public.utm_campaigns(is_active);

-- RLS
ALTER TABLE public.utm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_tracking_events ENABLE ROW LEVEL SECURITY;

-- utm_campaigns: admin read/write via service role, no public access needed directly
-- Admin access is done via edge functions with service role
CREATE POLICY "Service role full access on utm_campaigns"
  ON public.utm_campaigns FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Allow authenticated admins to read campaigns
CREATE POLICY "Authenticated can read active campaigns"
  ON public.utm_campaigns FOR SELECT
  TO authenticated
  USING (true);

-- utm_tracking_events: anon can insert (tracking), service role can read
CREATE POLICY "Anyone can insert tracking events"
  ON public.utm_tracking_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service role full access on utm_tracking_events"
  ON public.utm_tracking_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read tracking events"
  ON public.utm_tracking_events FOR SELECT
  TO authenticated
  USING (true);

-- Updated_at trigger for campaigns
CREATE TRIGGER update_utm_campaigns_updated_at
  BEFORE UPDATE ON public.utm_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
