
-- Enable pg_cron if not already
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Schedule process-firecrawl-jobs to run every 30 seconds
SELECT cron.schedule(
  'process-firecrawl-jobs',
  '*/1 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tkaezookvtpulfpaffes.supabase.co/functions/v1/process-firecrawl-jobs',
    body := '{}',
    params := '{}',
    headers := '{"Content-Type": "application/json"}',
    timeout_milliseconds := 30000
  );
  $$
);
