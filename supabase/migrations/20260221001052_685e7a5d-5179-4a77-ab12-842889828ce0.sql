
-- Voice Realtime: system_config keys
INSERT INTO system_config (config_key, config_value, description) VALUES
  ('voice_realtime_enabled', 'false', 'Habilitar modo de voz avanzado (Realtime API)'),
  ('voice_realtime_model', '"gpt-4o-realtime-preview"', 'Modelo para OpenAI Realtime API'),
  ('voice_realtime_voice', '"coral"', 'Voz del asistente en modo realtime'),
  ('voice_realtime_instructions', '"Eres un asistente legal experto en derecho colombiano. Responde siempre en español colombiano formal. Puedes ayudar con: dictado legal (repite y mejora lo dictado), consultas jurídicas (responde preguntas legales citando normas colombianas), y análisis de casos (analiza casos descritos verbalmente). Sé conciso, profesional y preciso en tus respuestas."', 'Instrucciones del sistema para el asistente de voz realtime'),
  ('voice_realtime_max_duration_seconds', '300', 'Duración máxima de sesión de voz realtime en segundos'),
  ('voice_realtime_vad_threshold', '0.5', 'Umbral de detección de actividad de voz (VAD) para realtime'),
  ('voice_realtime_transcription_model', '"whisper-1"', 'Modelo de transcripción para entrada de audio en realtime'),
  ('is_billable_voice_realtime', 'true', 'Indica si la herramienta voice_realtime es facturable')
ON CONFLICT (config_key) DO NOTHING;

-- Voice Realtime: credit_tool_costs entry
INSERT INTO credit_tool_costs (
  tool_type, tool_name, credit_cost, base_cost, description, icon, is_active,
  auto_calculate, technology_type, prompt_size_factor,
  gamification_enabled, gamification_percentage
) VALUES (
  'voice_realtime',
  'Asistente de Voz Avanzado (Realtime)',
  5, 5,
  'Conversación de voz bidireccional en tiempo real con IA legal especializada',
  'mic', true, false, 'openai_realtime', 1.0, true, 0.25
) ON CONFLICT (tool_type) DO NOTHING;

-- Voice Realtime: gamification tasks
INSERT INTO gamification_tasks (task_key, task_type, name, description, credit_reward, is_active, icon)
SELECT 'first_voice_realtime', 'onetime', 'Primera Conversación Realtime', 'Usa el asistente de voz avanzado por primera vez', 10, true, '🎤'
WHERE NOT EXISTS (SELECT 1 FROM gamification_tasks WHERE task_key = 'first_voice_realtime');

INSERT INTO gamification_tasks (task_key, task_type, name, description, credit_reward, is_active, icon)
SELECT 'use_voice_realtime_tool', 'daily', 'Usar Voz Realtime', 'Usa el asistente de voz avanzado hoy', 2, true, '🗣️'
WHERE NOT EXISTS (SELECT 1 FROM gamification_tasks WHERE task_key = 'use_voice_realtime_tool');

-- cost_calculation_config: add openai_realtime technology type
INSERT INTO cost_calculation_config (config_key, config_name, config_type, cost_multiplier, description, is_active)
SELECT 'openai_realtime', 'OpenAI Realtime API', 'technology', 2.5, 'Multiplicador para API Realtime de OpenAI', true
WHERE NOT EXISTS (SELECT 1 FROM cost_calculation_config WHERE config_type = 'technology' AND config_key = 'openai_realtime');
