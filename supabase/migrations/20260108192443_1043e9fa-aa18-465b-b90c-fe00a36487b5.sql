
-- Corregir inconsistencias entre credit_tool_costs y system_config
-- Los reasoning_key deben coincidir con las claves reales en system_config

-- Estrategia: reasoning_effort_strategy -> strategy_reasoning_effort
UPDATE credit_tool_costs 
SET reasoning_key = 'strategy_reasoning_effort' 
WHERE tool_type = 'strategy';

-- Análisis: ya está correcto (analysis_reasoning_effort)

-- Investigación: ya está correcto (research_reasoning_effort)

-- Redacción: reasoning_effort_drafting no existe, poner NULL
UPDATE credit_tool_costs 
SET reasoning_key = NULL 
WHERE tool_type = 'draft';

-- Predictor de Casos: reasoning_effort_strategy -> NULL (no tiene reasoning específico)
UPDATE credit_tool_costs 
SET reasoning_key = NULL 
WHERE tool_type = 'case_predictor';

-- SUIN-Juriscol: ya está correcto (suin_juriscol_reasoning_effort)

-- Crear las configuraciones de reasoning faltantes para drafting y case_predictor
INSERT INTO system_config (config_key, config_value, description)
VALUES 
  ('drafting_reasoning_effort', '"low"', 'Nivel de razonamiento para redacción legal'),
  ('case_predictor_reasoning_effort', '"high"', 'Nivel de razonamiento para predictor de casos')
ON CONFLICT (config_key) DO NOTHING;

-- Actualizar credit_tool_costs con las nuevas claves
UPDATE credit_tool_costs 
SET reasoning_key = 'drafting_reasoning_effort' 
WHERE tool_type = 'draft';

UPDATE credit_tool_costs 
SET reasoning_key = 'case_predictor_reasoning_effort' 
WHERE tool_type = 'case_predictor';
