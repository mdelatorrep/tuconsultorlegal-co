-- Remove old individual cron jobs if they exist
SELECT cron.unschedule('monitor-openai-status') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'monitor-openai-status'
);

SELECT cron.unschedule('monitor-n8n-status') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'monitor-n8n-status'
);

-- Create unified services monitoring cron job (every 5 minutes)
SELECT cron.schedule(
  'monitor-services-status',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://tkaezookvtpulfpaffes.supabase.co/functions/v1/monitor-services-status',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrYWV6b29rdnRwdWxmcGFmZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3NzEwNzUsImV4cCI6MjA2NzM0NzA3NX0.j7fSfaXMqwmytVuXIU4_miAbn-v65b5x0ncRr0K-CNE"}'::jsonb,
        body:='{"source": "cron_job"}'::jsonb
    ) as request_id;
  $$
);