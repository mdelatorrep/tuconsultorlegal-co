-- Add missing tool configurations to credit_tool_costs
INSERT INTO credit_tool_costs (tool_type, tool_name, credit_cost, description, icon, is_active) VALUES
('case_predictor', 'Predictor de Casos', 18, 'Predicción de resultados judiciales con IA avanzada', 'Scale', true),
('legal_copilot', 'Copilot Legal', 6, 'Asistencia en tiempo real para redacción legal', 'Sparkles', true),
('voice_transcription', 'Transcripción de Voz', 4, 'Transcripción y procesamiento de audio legal', 'Mic', true),
('process_monitor', 'Monitor de Procesos', 2, 'Sincronización y monitoreo de procesos judiciales', 'RefreshCw', true),
('lawyer_verification', 'Verificación Profesional', 8, 'Verificación de tarjeta profesional con la Rama Judicial', 'ShieldCheck', true),
('calendar_deadline', 'Cálculo de Términos', 3, 'Cálculo automático de términos legales', 'Calculator', true)
ON CONFLICT (tool_type) DO UPDATE SET
  tool_name = EXCLUDED.tool_name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;