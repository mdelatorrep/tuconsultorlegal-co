-- Add missing reasoning effort configurations for legal tools
INSERT INTO system_config (config_key, config_value, description)
VALUES 
  ('reasoning_effort_drafting', 'medium', 'Nivel de esfuerzo de razonamiento para redacción legal (low/medium/high)')
ON CONFLICT (config_key) DO NOTHING;

-- Add web search configurations for the 4 legal tools
INSERT INTO system_config (config_key, config_value, description)
VALUES 
  ('web_search_enabled_analysis', 'false', 'Habilitar búsqueda web para análisis de documentos'),
  ('web_search_categories_analysis', '[]', 'Categorías de URLs permitidas para análisis de documentos'),
  ('web_search_enabled_strategy', 'false', 'Habilitar búsqueda web para estrategia legal'),
  ('web_search_categories_strategy', '[]', 'Categorías de URLs permitidas para estrategia legal'),
  ('web_search_enabled_drafting', 'false', 'Habilitar búsqueda web para redacción legal'),
  ('web_search_categories_drafting', '[]', 'Categorías de URLs permitidas para redacción legal'),
  ('web_search_enabled_research', 'false', 'Habilitar búsqueda web configurada para investigación legal'),
  ('web_search_categories_research', '[]', 'Categorías de URLs permitidas para investigación legal')
ON CONFLICT (config_key) DO NOTHING;