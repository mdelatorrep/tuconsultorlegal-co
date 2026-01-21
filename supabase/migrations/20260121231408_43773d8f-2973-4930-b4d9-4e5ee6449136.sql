-- Fix OpenAI Assistant model to be compatible with Assistants API
-- gpt-5-nano is NOT compatible with Assistants API, must use gpt-4.1-2025-04-14

UPDATE system_config 
SET config_value = 'gpt-4.1-2025-04-14',
    updated_at = NOW()
WHERE config_key = 'openai_assistant_model';