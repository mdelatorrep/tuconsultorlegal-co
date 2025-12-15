-- Corregir el modelo del OpenAI Assistant a uno compatible con Assistants API
-- GPT-5 no es soportado por Assistants API, usar GPT-4.1
UPDATE system_config 
SET config_value = 'gpt-4.1-2025-04-14',
    updated_at = now()
WHERE config_key = 'openai_assistant_model';