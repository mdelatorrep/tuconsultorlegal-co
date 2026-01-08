
-- =========================================
-- SINCRONIZAR credit_tool_costs CON system_config Y configDefinitions.ts
-- =========================================

-- 1. AGREGAR herramientas que faltan en credit_tool_costs pero existen en system_config/configDefinitions
-- Cálculo de Términos ya existe

-- 2. AGREGAR reasoning_key donde falta pero existe en system_config
UPDATE credit_tool_costs 
SET reasoning_key = 'process_query_reasoning_effort' 
WHERE tool_type = 'process_query';

UPDATE credit_tool_costs 
SET reasoning_key = 'copilot_reasoning_effort' 
WHERE tool_type = 'legal_copilot';

UPDATE credit_tool_costs 
SET reasoning_key = 'crm_segmentation_reasoning_effort' 
WHERE tool_type = 'crm_ai';

-- 3. INSERTAR los reasoning_effort que faltan en system_config
INSERT INTO system_config (config_key, config_value, description)
VALUES 
  ('process_query_reasoning_effort', '"low"', 'Nivel de razonamiento para consulta de procesos judiciales'),
  ('copilot_reasoning_effort', '"low"', 'Nivel de razonamiento para copilot legal'),
  ('crm_segmentation_reasoning_effort', '"low"', 'Nivel de razonamiento para segmentación CRM'),
  ('spell_check_ai_model', '"gpt-5-nano"', 'Modelo para corrector ortográfico'),
  ('spell_check_reasoning_effort', '"low"', 'Nivel de razonamiento para corrector ortográfico'),
  ('calendar_deadline_ai_model', '"gpt-5-nano"', 'Modelo para cálculo de términos'),
  ('calendar_deadline_reasoning_effort', '"low"', 'Nivel de razonamiento para cálculo de términos')
ON CONFLICT (config_key) DO NOTHING;

-- 4. ACTUALIZAR credit_tool_costs para las herramientas que faltaban model_key/reasoning_key
UPDATE credit_tool_costs 
SET model_key = 'spell_check_ai_model', reasoning_key = 'spell_check_reasoning_effort', technology_type = 'text'
WHERE tool_type = 'spell_check';

UPDATE credit_tool_costs 
SET model_key = 'calendar_deadline_ai_model', reasoning_key = 'calendar_deadline_reasoning_effort', technology_type = 'text'
WHERE tool_type = 'calendar_deadline';

-- 5. AGREGAR herramientas que están en configDefinitions pero no en credit_tool_costs
-- Transcripción de voz ya existe
-- Verificación de abogado ya existe

-- Agregar las funciones de agentes que faltan
INSERT INTO credit_tool_costs (tool_type, tool_name, credit_cost, description, is_active, technology_type, base_cost, model_key, reasoning_key, auto_calculate)
VALUES 
  ('improve_clause', 'Mejorar Cláusulas', 1, 'Optimización de cláusulas legales', true, 'text', 1, 'improve_clause_ai_model', 'improve_clause_reasoning_effort', true),
  ('suggest_blocks', 'Bloques de Conversación', 1, 'Generación de bloques para agentes', true, 'text', 1, 'suggest_blocks_ai_model', 'suggest_blocks_reasoning_effort', true),
  ('document_chat', 'Chat de Documentos', 1, 'Recopilación de información del usuario', true, 'text', 1, 'document_chat_ai_model', 'document_chat_reasoning_effort', true),
  ('lexi', 'Asistente Lexi', 1, 'Asistente legal principal', true, 'text', 1, 'lexi_ai_model', 'lexi_reasoning_effort', true),
  ('routing', 'Routing de Consultas', 1, 'Clasificación de consultas', true, 'text', 1, 'routing_ai_model', 'routing_reasoning_effort', true),
  ('training', 'Asistente Entrenamiento', 1, 'Formación de abogados', true, 'text', 1, 'training_assistant_ai_model', 'training_assistant_reasoning_effort', true),
  ('organize_file', 'Organizar Archivos', 1, 'Organización de archivos', true, 'text', 1, 'organize_file_ai_model', 'organize_file_reasoning_effort', true)
ON CONFLICT (tool_type) DO NOTHING;

-- 6. INSERTAR los reasoning/model keys que aún faltan en system_config
INSERT INTO system_config (config_key, config_value, description)
VALUES 
  ('improve_clause_reasoning_effort', '"low"', 'Nivel de razonamiento para mejorar cláusulas'),
  ('suggest_blocks_reasoning_effort', '"low"', 'Nivel de razonamiento para bloques de conversación'),
  ('document_chat_reasoning_effort', '"low"', 'Nivel de razonamiento para chat de documentos'),
  ('generate_document_reasoning_effort', '"low"', 'Nivel de razonamiento para generar documentos'),
  ('lexi_reasoning_effort', '"low"', 'Nivel de razonamiento para Lexi'),
  ('routing_reasoning_effort', '"low"', 'Nivel de razonamiento para routing'),
  ('organize_file_reasoning_effort', '"low"', 'Nivel de razonamiento para organizar archivos'),
  ('improve_document_info_reasoning_effort', '"low"', 'Nivel de razonamiento para mejorar info de documentos')
ON CONFLICT (config_key) DO NOTHING;
