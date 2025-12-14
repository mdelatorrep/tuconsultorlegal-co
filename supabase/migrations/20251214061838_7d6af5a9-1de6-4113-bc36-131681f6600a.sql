-- Insert reasoning effort configuration keys
INSERT INTO system_config (config_key, config_value, description) VALUES
  ('reasoning_effort_default', 'low', 'Nivel de razonamiento por defecto para funciones de generación de texto simple'),
  ('reasoning_effort_analysis', 'medium', 'Nivel de razonamiento para funciones de análisis de documentos'),
  ('reasoning_effort_strategy', 'high', 'Nivel de razonamiento para funciones de estrategia legal'),
  ('reasoning_effort_research', 'high', 'Nivel de razonamiento para funciones de investigación legal')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description;