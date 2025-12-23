-- Fase 1: Sincronizar tool_types entre código y base de datos
UPDATE credit_tool_costs SET tool_type = 'research' WHERE tool_type = 'legal_research';
UPDATE credit_tool_costs SET tool_type = 'draft' WHERE tool_type = 'document_drafting';
UPDATE credit_tool_costs SET tool_type = 'analysis' WHERE tool_type = 'document_analysis';
UPDATE credit_tool_costs SET tool_type = 'strategy' WHERE tool_type = 'strategy_analysis';
UPDATE credit_tool_costs SET tool_type = 'process_query' WHERE tool_type = 'judicial_process';

-- Fase 4: Actualizar tareas de gamificación para detectar uso de herramientas
-- Agregar tareas diarias para uso de herramientas IA
INSERT INTO gamification_tasks (task_key, task_type, name, description, credit_reward, max_completions, display_order, icon, badge_name, completion_criteria, is_active)
VALUES 
  ('use_research_tool', 'daily', 'Investigador del Día', 'Usa la herramienta de Investigación Legal IA', 5, 1, 10, 'Search', 'Investigador', '{"tool_type": "research", "min_uses": 1}'::jsonb, true),
  ('use_draft_tool', 'daily', 'Redactor del Día', 'Usa la herramienta de Redacción Legal IA', 5, 1, 11, 'PenTool', 'Redactor', '{"tool_type": "draft", "min_uses": 1}'::jsonb, true),
  ('use_analysis_tool', 'daily', 'Analista del Día', 'Usa la herramienta de Análisis de Documentos', 5, 1, 12, 'FileText', 'Analista', '{"tool_type": "analysis", "min_uses": 1}'::jsonb, true),
  ('use_strategy_tool', 'daily', 'Estratega del Día', 'Usa la herramienta de Estrategia Legal', 5, 1, 13, 'Brain', 'Estratega', '{"tool_type": "strategy", "min_uses": 1}'::jsonb, true),
  ('use_process_query', 'daily', 'Consultor Judicial', 'Consulta un proceso judicial', 5, 1, 14, 'Scale', 'Consultor', '{"tool_type": "process_query", "min_uses": 1}'::jsonb, true),
  ('use_crm_ai', 'weekly', 'CRM Inteligente', 'Usa la segmentación IA del CRM', 10, 1, 20, 'Users', 'CRM Master', '{"tool_type": "crm_ai", "min_uses": 1}'::jsonb, true),
  ('use_suin_juriscol', 'daily', 'Consultor Normativo', 'Consulta SUIN-Juriscol', 3, 1, 15, 'BookOpen', 'Normativo', '{"tool_type": "suin_juriscol", "min_uses": 1}'::jsonb, true)
ON CONFLICT (task_key) DO UPDATE SET
  completion_criteria = EXCLUDED.completion_criteria,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Agregar logros por uso frecuente de herramientas
INSERT INTO gamification_tasks (task_key, task_type, name, description, credit_reward, max_completions, display_order, icon, badge_name, completion_criteria, is_active)
VALUES 
  ('research_master', 'achievement', 'Maestro Investigador', 'Realiza 50 investigaciones legales', 100, 1, 30, 'Search', 'Maestro Investigador', '{"tool_type": "research", "min_uses": 50}'::jsonb, true),
  ('draft_master', 'achievement', 'Maestro Redactor', 'Redacta 30 documentos legales', 100, 1, 31, 'PenTool', 'Maestro Redactor', '{"tool_type": "draft", "min_uses": 30}'::jsonb, true),
  ('analysis_master', 'achievement', 'Maestro Analista', 'Analiza 40 documentos', 100, 1, 32, 'FileText', 'Maestro Analista', '{"tool_type": "analysis", "min_uses": 40}'::jsonb, true),
  ('strategy_master', 'achievement', 'Maestro Estratega', 'Realiza 25 análisis estratégicos', 100, 1, 33, 'Brain', 'Maestro Estratega', '{"tool_type": "strategy", "min_uses": 25}'::jsonb, true),
  ('tools_explorer', 'achievement', 'Explorador de Herramientas', 'Usa todas las herramientas IA al menos una vez', 50, 1, 34, 'Sparkles', 'Explorador', '{"all_tools": true}'::jsonb, true)
ON CONFLICT (task_key) DO UPDATE SET
  completion_criteria = EXCLUDED.completion_criteria,
  is_active = EXCLUDED.is_active,
  updated_at = now();