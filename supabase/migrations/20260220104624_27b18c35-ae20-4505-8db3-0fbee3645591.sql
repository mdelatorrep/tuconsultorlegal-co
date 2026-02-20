
-- Table to track Firecrawl agent jobs asynchronously
CREATE TABLE public.firecrawl_agent_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL,
  radicado TEXT NOT NULL,
  firecrawl_job_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  query_type TEXT DEFAULT 'radicado',
  extracted_data JSONB,
  ai_analysis TEXT,
  error_message TEXT,
  poll_attempts INTEGER DEFAULT 0,
  max_poll_attempts INTEGER DEFAULT 12,
  last_polled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for polling processor to find pending jobs
CREATE INDEX idx_firecrawl_jobs_status ON public.firecrawl_agent_jobs (status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_firecrawl_jobs_lawyer ON public.firecrawl_agent_jobs (lawyer_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.firecrawl_agent_jobs ENABLE ROW LEVEL SECURITY;

-- Lawyers can view their own jobs
CREATE POLICY "Lawyers can view their own firecrawl jobs"
  ON public.firecrawl_agent_jobs FOR SELECT
  USING (auth.uid() = lawyer_id);

-- Only service role inserts/updates (via edge functions)
CREATE POLICY "Service role manages firecrawl jobs"
  ON public.firecrawl_agent_jobs FOR ALL
  USING (auth.uid() = lawyer_id);

-- Auto-update updated_at
CREATE TRIGGER update_firecrawl_jobs_updated_at
  BEFORE UPDATE ON public.firecrawl_agent_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
