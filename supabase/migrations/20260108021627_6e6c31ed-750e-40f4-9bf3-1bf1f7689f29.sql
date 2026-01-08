-- Insert suin_juriscol_reasoning_effort configuration if not exists
INSERT INTO public.system_config (config_key, config_value, description)
VALUES (
  'suin_juriscol_reasoning_effort',
  'medium',
  'Nivel de esfuerzo de razonamiento para búsquedas SUIN-Juriscol (low, medium, high)'
)
ON CONFLICT (config_key) DO NOTHING;