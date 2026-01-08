-- Eliminar configuraciones duplicadas que no se usan en credit_tool_costs
-- Mantener solo las que están referenciadas en credit_tool_costs

-- Eliminar training_reasoning_effort ya que credit_tool_costs usa training_assistant_reasoning_effort
DELETE FROM system_config WHERE config_key = 'training_reasoning_effort';

-- Eliminar training_ai_model si existe ya que credit_tool_costs usa training_assistant_ai_model
DELETE FROM system_config WHERE config_key = 'training_ai_model';