
-- Nuevo costo para follow-ups
INSERT INTO credit_tool_costs (tool_type, tool_name, base_cost, credit_cost, auto_calculate, is_active, description)
VALUES ('suin_juriscol_followup', 'SUIN-Juriscol Seguimiento', 1, 1, false, true, 'Costo por mensaje de seguimiento en SUIN-Juriscol')
ON CONFLICT (tool_type) DO UPDATE SET base_cost = 1, auto_calculate = false, credit_cost = 1;

-- Actualizar costo de busqueda inicial
UPDATE credit_tool_costs 
SET base_cost = 3, auto_calculate = false, credit_cost = 3
WHERE tool_type = 'suin_juriscol';

-- Subir reasoning effort
UPDATE system_config 
SET config_value = 'medium', updated_at = now()
WHERE config_key = 'suin_juriscol_reasoning_effort';
