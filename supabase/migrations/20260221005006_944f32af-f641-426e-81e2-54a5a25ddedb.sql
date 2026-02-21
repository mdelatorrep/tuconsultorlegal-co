
-- Insert voice_realtime_mini tool cost entry
INSERT INTO public.credit_tool_costs (
  tool_type, tool_name, description, credit_cost, base_cost, 
  auto_calculate, is_active, icon, technology_type, 
  gamification_enabled, gamification_percentage, prompt_size_factor
) VALUES (
  'voice_realtime_mini',
  'Asistente de Voz Avanzado (Mini)',
  'Conversación de voz bidireccional en tiempo real con IA (modelo mini, más económico)',
  1, 1,
  false, true, 'mic', 'openai_realtime',
  true, 0.25, 1.0
);

-- Add mode multiplier configs
INSERT INTO public.system_config (config_key, config_value, description)
VALUES 
  ('voice_realtime_mode_multiplier_dictation', '0.6', 'Multiplicador de costo para modo dictado (menos tokens)')
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.system_config (config_key, config_value, description)
VALUES 
  ('voice_realtime_mode_multiplier_consultation', '1.0', 'Multiplicador de costo para modo consulta (estándar)')
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.system_config (config_key, config_value, description)
VALUES 
  ('voice_realtime_mode_multiplier_analysis', '1.5', 'Multiplicador de costo para modo análisis (más contexto)')
ON CONFLICT (config_key) DO NOTHING;

-- Add billable config for mini
INSERT INTO public.system_config (config_key, config_value, description)
VALUES 
  ('is_billable_voice_realtime_mini', 'true', 'Habilitar facturación para voz realtime mini')
ON CONFLICT (config_key) DO NOTHING;

-- Add gamification tasks for mini
INSERT INTO public.gamification_tasks (task_key, task_type, name, description, credit_reward, is_active)
VALUES
  ('first_voice_realtime_mini', 'onetime', 'Primera sesión de voz (Mini)', 'Usa el asistente de voz avanzado mini por primera vez', 2, true),
  ('use_voice_realtime_mini_tool', 'daily', 'Usar asistente de voz (Mini)', 'Usa el asistente de voz avanzado mini hoy', 1, true)
ON CONFLICT (task_key) DO NOTHING;
