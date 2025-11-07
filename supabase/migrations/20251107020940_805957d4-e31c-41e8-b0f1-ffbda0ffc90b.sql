-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the check-research-tasks function to run every 2 minutes
SELECT cron.schedule(
  'check-research-tasks',
  '*/2 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://tkaezookvtpulfpaffes.supabase.co/functions/v1/check-research-tasks',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrYWV6b29rdnRwdWxmcGFmZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3NzEwNzUsImV4cCI6MjA2NzM0NzA3NX0.j7fSfaXMqwmytVuXIU4_miAbn-v65b5x0ncRr0K-CNE"}'::jsonb,
        body:='{"source": "cron_job"}'::jsonb
    ) as request_id;
  $$
);
