-- 1. Add gamification columns to credit_tool_costs
ALTER TABLE credit_tool_costs 
ADD COLUMN IF NOT EXISTS gamification_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS gamification_percentage DECIMAL(5,4) DEFAULT 0.25,
ADD COLUMN IF NOT EXISTS gamification_reward INTEGER DEFAULT 0;

COMMENT ON COLUMN credit_tool_costs.gamification_enabled IS 'Whether this tool awards gamification points';
COMMENT ON COLUMN credit_tool_costs.gamification_percentage IS 'Percentage of base cost to award as points (0.25 = 25%)';
COMMENT ON COLUMN credit_tool_costs.gamification_reward IS 'Calculated reward points (auto-calculated from percentage)';

-- 2. Add global gamification configs to system_config
INSERT INTO system_config (config_key, config_value, description)
VALUES 
  ('gamification_base_percentage', '0.25', 'Porcentaje base del costo como recompensa (0.25 = 25%)'),
  ('gamification_onetime_multiplier', '2.0', 'Multiplicador para tareas de primera vez'),
  ('gamification_daily_multiplier', '0.5', 'Multiplicador para tareas diarias'),
  ('gamification_include_in_cost', 'true', 'Incluir costo de gamificación en el costo total de la herramienta'),
  ('gamification_cost_factor', '1.1', 'Factor de costo adicional por gamificación (1.1 = 10% adicional)')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

-- 3. Update calculate_tool_credit_cost to include gamification cost and calculate reward
CREATE OR REPLACE FUNCTION public.calculate_tool_credit_cost(p_tool_type text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tool RECORD;
  v_model_multiplier DECIMAL := 1.0;
  v_reasoning_multiplier DECIMAL := 1.0;
  v_technology_multiplier DECIMAL := 1.0;
  v_prompt_multiplier DECIMAL := 1.0;
  v_platform_margin DECIMAL := 3.5;
  v_infrastructure DECIMAL := 1.2;
  v_gamification_cost_factor DECIMAL := 1.0;
  v_include_gamification_cost BOOLEAN := true;
  v_model_value TEXT;
  v_reasoning_value TEXT;
  v_calculated_cost DECIMAL;
  v_gamification_reward INTEGER := 0;
  v_base_reward DECIMAL;
BEGIN
  -- Get tool configuration
  SELECT * INTO v_tool FROM credit_tool_costs WHERE tool_type = p_tool_type;
  
  IF v_tool IS NULL THEN
    RETURN 1;
  END IF;
  
  -- If auto_calculate is false, just calculate gamification and return current cost
  IF NOT COALESCE(v_tool.auto_calculate, true) THEN
    -- Still calculate gamification reward even if cost is manual
    IF COALESCE(v_tool.gamification_enabled, true) THEN
      v_gamification_reward := GREATEST(1, ROUND(v_tool.credit_cost * COALESCE(v_tool.gamification_percentage, 0.25))::INTEGER);
      UPDATE credit_tool_costs SET gamification_reward = v_gamification_reward WHERE tool_type = p_tool_type;
    END IF;
    RETURN v_tool.credit_cost;
  END IF;
  
  -- Get model multiplier from system_config
  IF v_tool.model_key IS NOT NULL THEN
    SELECT config_value INTO v_model_value FROM system_config WHERE config_key = v_tool.model_key;
    IF v_model_value IS NOT NULL THEN
      SELECT cost_multiplier INTO v_model_multiplier 
      FROM cost_calculation_config 
      WHERE config_type = 'model' AND config_key = v_model_value;
    END IF;
  END IF;
  
  -- Get reasoning multiplier
  IF v_tool.reasoning_key IS NOT NULL THEN
    SELECT config_value INTO v_reasoning_value FROM system_config WHERE config_key = v_tool.reasoning_key;
    IF v_reasoning_value IS NOT NULL THEN
      SELECT cost_multiplier INTO v_reasoning_multiplier 
      FROM cost_calculation_config 
      WHERE config_type = 'reasoning' AND config_key = v_reasoning_value;
    END IF;
  END IF;
  
  -- Get technology multiplier
  SELECT cost_multiplier INTO v_technology_multiplier 
  FROM cost_calculation_config 
  WHERE config_type = 'technology' AND config_key = v_tool.technology_type;
  
  -- Get prompt size factor
  v_prompt_multiplier := COALESCE(v_tool.prompt_size_factor, 1.0);
  
  -- Get platform margins
  SELECT cost_multiplier INTO v_platform_margin 
  FROM cost_calculation_config 
  WHERE config_type = 'margin' AND config_key = 'platform_margin';
  
  SELECT cost_multiplier INTO v_infrastructure 
  FROM cost_calculation_config 
  WHERE config_type = 'margin' AND config_key = 'infrastructure_overhead';
  
  -- Get gamification cost settings
  SELECT (config_value)::boolean INTO v_include_gamification_cost 
  FROM system_config WHERE config_key = 'gamification_include_in_cost';
  
  SELECT (config_value)::decimal INTO v_gamification_cost_factor 
  FROM system_config WHERE config_key = 'gamification_cost_factor';
  
  -- Base calculation without gamification
  v_calculated_cost := COALESCE(v_tool.base_cost, 1) 
    * COALESCE(v_model_multiplier, 1.0)
    * COALESCE(v_reasoning_multiplier, 1.0)
    * COALESCE(v_technology_multiplier, 1.0)
    * v_prompt_multiplier
    * COALESCE(v_platform_margin, 3.5)
    * COALESCE(v_infrastructure, 1.2);
  
  -- Calculate gamification reward BEFORE adding gamification cost to total
  IF COALESCE(v_tool.gamification_enabled, true) THEN
    v_base_reward := v_calculated_cost * COALESCE(v_tool.gamification_percentage, 0.25);
    v_gamification_reward := GREATEST(1, ROUND(v_base_reward)::INTEGER);
    
    -- Include gamification cost in total if configured
    IF COALESCE(v_include_gamification_cost, true) THEN
      v_calculated_cost := v_calculated_cost * COALESCE(v_gamification_cost_factor, 1.1);
    END IF;
  ELSE
    v_gamification_reward := 0;
  END IF;
  
  -- Update the tool with calculated reward
  UPDATE credit_tool_costs 
  SET gamification_reward = v_gamification_reward,
      updated_at = now()
  WHERE tool_type = p_tool_type;
  
  -- Return rounded cost, minimum 1
  RETURN GREATEST(1, ROUND(v_calculated_cost)::INTEGER);
END;
$function$;

-- 4. Create function to sync gamification_tasks rewards from tool costs
CREATE OR REPLACE FUNCTION public.sync_gamification_task_rewards()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tool RECORD;
  v_task_key TEXT;
  v_onetime_multiplier DECIMAL;
  v_daily_multiplier DECIMAL;
  v_calculated_reward INTEGER;
BEGIN
  -- Get multipliers from config
  SELECT COALESCE((config_value)::decimal, 2.0) INTO v_onetime_multiplier
  FROM system_config WHERE config_key = 'gamification_onetime_multiplier';
  
  SELECT COALESCE((config_value)::decimal, 0.5) INTO v_daily_multiplier
  FROM system_config WHERE config_key = 'gamification_daily_multiplier';
  
  -- Sync tool-based tasks
  FOR v_tool IN 
    SELECT tool_type, gamification_reward, gamification_enabled 
    FROM credit_tool_costs 
    WHERE is_active = true
  LOOP
    -- Map tool_type to task_key patterns
    -- Daily tasks: use_{tool_type}_tool
    v_task_key := 'use_' || v_tool.tool_type || '_tool';
    
    IF v_tool.gamification_enabled AND v_tool.gamification_reward > 0 THEN
      -- Update daily tasks
      v_calculated_reward := GREATEST(1, ROUND(v_tool.gamification_reward * v_daily_multiplier)::INTEGER);
      UPDATE gamification_tasks 
      SET credit_reward = v_calculated_reward, updated_at = now()
      WHERE task_key = v_task_key AND task_type = 'daily';
      
      -- Update one-time "first use" tasks
      v_task_key := 'first_' || v_tool.tool_type;
      v_calculated_reward := GREATEST(1, ROUND(v_tool.gamification_reward * v_onetime_multiplier)::INTEGER);
      UPDATE gamification_tasks 
      SET credit_reward = v_calculated_reward, updated_at = now()
      WHERE task_key = v_task_key AND task_type = 'onetime';
    ELSE
      -- Disable gamification for this tool's tasks
      UPDATE gamification_tasks 
      SET credit_reward = 0, is_active = false, updated_at = now()
      WHERE task_key LIKE '%' || v_tool.tool_type || '%';
    END IF;
  END LOOP;
  
  RAISE LOG '[GAMIFICATION] Task rewards synced from tool costs';
END;
$function$;

-- 5. Update trigger to also sync gamification when costs change
CREATE OR REPLACE FUNCTION public.on_tool_cost_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Sync gamification task rewards
  PERFORM sync_gamification_task_rewards();
  RAISE LOG '[GAMIFICATION] Synced rewards after tool cost change: %', NEW.tool_type;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_tool_cost_update ON credit_tool_costs;
CREATE TRIGGER on_tool_cost_update
  AFTER UPDATE ON credit_tool_costs
  FOR EACH ROW
  EXECUTE FUNCTION on_tool_cost_change();

-- 6. Update existing tools with gamification settings
UPDATE credit_tool_costs SET 
  gamification_enabled = true,
  gamification_percentage = 0.25
WHERE is_active = true;

-- 7. Recalculate all costs to populate gamification_reward
SELECT recalculate_all_tool_costs();

-- 8. Sync gamification task rewards
SELECT sync_gamification_task_rewards();