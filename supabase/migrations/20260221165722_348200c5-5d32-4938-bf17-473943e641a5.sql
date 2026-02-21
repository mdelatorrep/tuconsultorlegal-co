INSERT INTO public.system_config (config_key, config_value, description)
VALUES ('analysis_web_search', 'true', 'Habilitar búsqueda web durante el análisis de documentos legales')
ON CONFLICT (config_key) DO NOTHING;