-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the OpenAI agent job processor to run every 2 minutes
SELECT cron.schedule(
  'process-openai-agent-jobs',
  '*/2 * * * *', -- every 2 minutes
  $$
  SELECT
    net.http_post(
        url := 'https://tkaezookvtpulfpaffes.supabase.co/functions/v1/process-openai-agent-jobs',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrYWV6b29rdnRwdWxmcGFmZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3NzEwNzUsImV4cCI6MjA2NzM0NzA3NX0.j7fSfaXMqwmytVuXIU4_miAbn-v65b5x0ncRr0K-CNE"}'::jsonb,
        body := concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Create analytics view for OpenAI agent performance
CREATE OR REPLACE VIEW public.openai_agent_analytics AS
SELECT 
  la.id as legal_agent_id,
  la.name as agent_name,
  la.document_name,
  la.target_audience,
  la.openai_enabled,
  la.openai_conversations_count,
  la.openai_success_rate,
  la.last_openai_activity,
  oa.id as openai_agent_id,
  oa.openai_agent_id as openai_external_id,
  oa.status as openai_status,
  oa.created_at as openai_created_at,
  
  -- Job status summary
  (SELECT COUNT(*) FROM openai_agent_jobs oaj WHERE oaj.legal_agent_id = la.id AND oaj.status = 'completed') as jobs_completed,
  (SELECT COUNT(*) FROM openai_agent_jobs oaj WHERE oaj.legal_agent_id = la.id AND oaj.status = 'failed') as jobs_failed,
  (SELECT COUNT(*) FROM openai_agent_jobs oaj WHERE oaj.legal_agent_id = la.id AND oaj.status = 'pending') as jobs_pending,
  
  -- Conversation metrics
  (SELECT COUNT(*) FROM agent_conversations ac WHERE ac.openai_agent_id = oa.id) as total_conversations,
  (SELECT COUNT(*) FROM document_tokens dt 
   JOIN agent_conversations ac ON ac.document_token_id = dt.id 
   WHERE ac.openai_agent_id = oa.id AND dt.status IN ('pagado', 'descargado')) as successful_documents,
   
  -- Calculate success rate
  CASE 
    WHEN (SELECT COUNT(*) FROM agent_conversations ac WHERE ac.openai_agent_id = oa.id) > 0 
    THEN ROUND(
      (SELECT COUNT(*) FROM document_tokens dt 
       JOIN agent_conversations ac ON ac.document_token_id = dt.id 
       WHERE ac.openai_agent_id = oa.id AND dt.status IN ('pagado', 'descargado'))::decimal 
      / 
      (SELECT COUNT(*) FROM agent_conversations ac WHERE ac.openai_agent_id = oa.id)::decimal 
      * 100, 2
    )
    ELSE 0
  END as calculated_success_rate

FROM legal_agents la
LEFT JOIN openai_agents oa ON oa.legal_agent_id = la.id AND oa.status = 'active'
WHERE la.status = 'approved'
ORDER BY la.created_at DESC;

-- Grant access to the analytics view
GRANT SELECT ON public.openai_agent_analytics TO authenticated, anon, service_role;