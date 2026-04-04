-- Fix corrupted feature_flags_sidebar value
UPDATE system_config 
SET config_value = '{"dashboard":true,"research":true,"suin-juriscol":true,"process-query":true,"process-monitor":true,"analyze":true,"draft":true,"voice-assistant":true,"crm":true,"client-portal":true,"legal-calendar":true,"specialized-agents":true,"strategize":true,"case-predictor":true,"agent-creator":true,"agent-manager":true,"stats":true,"request-agent-access":true,"training":true,"blog-manager":true,"request-blog-access":true,"credits":true,"gamification":true,"public-profile":true,"account-settings":true}',
    updated_at = now()
WHERE config_key = 'feature_flags_sidebar';