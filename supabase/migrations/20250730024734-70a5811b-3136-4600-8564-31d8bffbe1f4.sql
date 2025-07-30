-- Insertar configuración por defecto para openai_model si no existe
INSERT INTO public.system_config (config_key, config_value, description)
VALUES ('openai_model', 'gpt-4.1-2025-04-14', 'Modelo de OpenAI utilizado por defecto en todas las funciones de IA del sistema')
ON CONFLICT (config_key) DO NOTHING;