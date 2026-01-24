-- Update all models with web_search enabled from nano to mini
UPDATE system_config 
SET config_value = 'gpt-5-mini', updated_at = now()
WHERE config_key IN (
  'improve_clause_ai_model',
  'lexi_ai_model', 
  'process_query_ai_model',
  'training_assistant_ai_model'
) AND config_value = 'gpt-5-nano';