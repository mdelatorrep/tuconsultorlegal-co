-- Fix incorrect AI model name in system_config
UPDATE system_config 
SET config_value = 'gpt-4o-mini', updated_at = now()
WHERE config_key = 'process_query_ai_model' AND config_value = 'gpt-5-mini';

-- Fix reasoning effort to match valid values
UPDATE system_config 
SET config_value = 'medium', updated_at = now()
WHERE config_key = 'process_query_reasoning_effort' AND config_value = 'low';