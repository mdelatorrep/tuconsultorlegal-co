SELECT cron.unschedule(8);

SELECT cron.schedule(
  'lawyer-journey-automation-daily',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tkaezookvtpulfpaffes.supabase.co/functions/v1/lawyer-journey-automation',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrYWV6b29rdnRwdWxmcGFmZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3NzEwNzUsImV4cCI6MjA2NzM0NzA3NX0.j7fSfaXMqwmytVuXIU4_miAbn-v65b5x0ncRr0K-CNE"}'::jsonb,
    body := '{"source": "daily_cron_8am_col"}'::jsonb
  ) AS request_id;
  $$
);