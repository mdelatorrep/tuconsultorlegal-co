
-- Add cost calculation fields to credit_tool_costs
ALTER TABLE public.credit_tool_costs 
ADD COLUMN IF NOT EXISTS technology_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS base_cost INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS model_key TEXT,
ADD COLUMN IF NOT EXISTS reasoning_key TEXT,
ADD COLUMN IF NOT EXISTS prompt_size_factor DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS auto_calculate BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS cost_formula_version INTEGER DEFAULT 1;

-- Create table for cost calculation configuration
CREATE TABLE IF NOT EXISTS public.cost_calculation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type TEXT NOT NULL, -- 'model', 'reasoning', 'technology', 'prompt_size', 'margin'
  config_key TEXT NOT NULL,
  config_name TEXT NOT NULL,
  cost_multiplier DECIMAL(5,2) DEFAULT 1.0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(config_type, config_key)
);

-- Enable RLS
ALTER TABLE public.cost_calculation_config ENABLE ROW LEVEL SECURITY;

-- Allow public read for config (needed by admin)
CREATE POLICY "Allow public read on cost_calculation_config" 
ON public.cost_calculation_config FOR SELECT USING (true);

-- Allow admin update/insert via service role
CREATE POLICY "Allow service role to manage cost_calculation_config" 
ON public.cost_calculation_config FOR ALL USING (true);

-- Insert model cost multipliers (based on actual OpenAI pricing ratios)
INSERT INTO public.cost_calculation_config (config_type, config_key, config_name, cost_multiplier, description, display_order) VALUES
-- Models: multiplier based on relative cost (gpt-4o = 1x baseline for expensive)
('model', 'gpt-5-nano', 'GPT-5 Nano', 0.3, 'Modelo económico para tareas simples', 1),
('model', 'gpt-5-mini', 'GPT-5 Mini', 0.8, 'Modelo balanceado calidad/precio', 2),
('model', 'gpt-5', 'GPT-5', 2.5, 'Modelo avanzado con alta capacidad', 3),
('model', 'gpt-4.1-2025-04-14', 'GPT-4.1', 1.5, 'Modelo de última generación', 4),
('model', 'gpt-4o', 'GPT-4o', 1.0, 'Modelo multimodal optimizado', 5),
('model', 'gpt-4o-mini', 'GPT-4o Mini', 0.4, 'Versión económica multimodal', 6),
('model', 'o1', 'O1 (Reasoning)', 3.0, 'Modelo especializado en razonamiento complejo', 7),
('model', 'o1-mini', 'O1 Mini', 1.5, 'Reasoning económico', 8),
('model', 'o3-mini', 'O3 Mini', 2.0, 'Nuevo modelo reasoning', 9),
('model', 'whisper-1', 'Whisper', 1.2, 'Transcripción de audio', 10),
('model', 'tts-1', 'TTS-1', 0.8, 'Texto a voz básico', 11),
('model', 'tts-1-hd', 'TTS-1 HD', 1.5, 'Texto a voz alta calidad', 12)
ON CONFLICT (config_type, config_key) DO UPDATE SET
  config_name = EXCLUDED.config_name,
  cost_multiplier = EXCLUDED.cost_multiplier,
  description = EXCLUDED.description;

-- Reasoning effort multipliers
INSERT INTO public.cost_calculation_config (config_type, config_key, config_name, cost_multiplier, description, display_order) VALUES
('reasoning', 'low', 'Bajo', 1.0, 'Esfuerzo mínimo de razonamiento', 1),
('reasoning', 'medium', 'Medio', 1.5, 'Razonamiento estándar', 2),
('reasoning', 'high', 'Alto', 2.5, 'Razonamiento exhaustivo y profundo', 3)
ON CONFLICT (config_type, config_key) DO UPDATE SET
  config_name = EXCLUDED.config_name,
  cost_multiplier = EXCLUDED.cost_multiplier;

-- Technology type multipliers
INSERT INTO public.cost_calculation_config (config_type, config_key, config_name, cost_multiplier, description, display_order) VALUES
('technology', 'text', 'Texto', 1.0, 'Procesamiento de texto estándar', 1),
('technology', 'audio', 'Audio', 1.8, 'Transcripción y procesamiento de audio', 2),
('technology', 'vision', 'Visión', 2.0, 'Análisis de imágenes y documentos escaneados', 3),
('technology', 'multimodal', 'Multimodal', 2.2, 'Combinación de texto, audio y/o visión', 4),
('technology', 'external_api', 'API Externa', 1.5, 'Consulta a APIs de terceros (Rama Judicial, etc)', 5),
('technology', 'web_search', 'Búsqueda Web', 1.3, 'Búsqueda y recopilación de información web', 6)
ON CONFLICT (config_type, config_key) DO UPDATE SET
  config_name = EXCLUDED.config_name,
  cost_multiplier = EXCLUDED.cost_multiplier;

-- Prompt/response size factors
INSERT INTO public.cost_calculation_config (config_type, config_key, config_name, cost_multiplier, description, display_order) VALUES
('prompt_size', 'small', 'Pequeño (<1K tokens)', 0.8, 'Prompts cortos y respuestas breves', 1),
('prompt_size', 'medium', 'Medio (1K-4K tokens)', 1.0, 'Tamaño promedio', 2),
('prompt_size', 'large', 'Grande (4K-16K tokens)', 1.8, 'Análisis extensos', 3),
('prompt_size', 'xlarge', 'Muy Grande (>16K tokens)', 3.0, 'Documentos largos o múltiples', 4)
ON CONFLICT (config_type, config_key) DO UPDATE SET
  config_name = EXCLUDED.config_name,
  cost_multiplier = EXCLUDED.cost_multiplier;

-- Platform margin configuration
INSERT INTO public.cost_calculation_config (config_type, config_key, config_name, cost_multiplier, description, display_order) VALUES
('margin', 'platform_margin', 'Margen de Plataforma', 3.5, 'Multiplicador para cubrir costos operativos y rentabilidad (3.5x = 250% margen)', 1),
('margin', 'infrastructure_overhead', 'Overhead Infraestructura', 1.2, 'Factor adicional por costos de servidores, CDN, etc', 2)
ON CONFLICT (config_type, config_key) DO UPDATE SET
  config_name = EXCLUDED.config_name,
  cost_multiplier = EXCLUDED.cost_multiplier,
  description = EXCLUDED.description;

-- Update existing tool costs with configuration keys
UPDATE public.credit_tool_costs SET
  technology_type = 'text',
  model_key = 'research_ai_model',
  reasoning_key = 'research_reasoning_effort',
  prompt_size_factor = 1.0
WHERE tool_type = 'research';

UPDATE public.credit_tool_costs SET
  technology_type = 'text',
  model_key = 'drafting_ai_model',
  reasoning_key = 'reasoning_effort_drafting',
  prompt_size_factor = 1.5
WHERE tool_type = 'draft';

UPDATE public.credit_tool_costs SET
  technology_type = 'text',
  model_key = 'analysis_ai_model',
  reasoning_key = 'analysis_reasoning_effort',
  prompt_size_factor = 1.2
WHERE tool_type = 'analysis';

UPDATE public.credit_tool_costs SET
  technology_type = 'text',
  model_key = 'strategy_ai_model',
  reasoning_key = 'reasoning_effort_strategy',
  prompt_size_factor = 1.3
WHERE tool_type = 'strategy';

UPDATE public.credit_tool_costs SET
  technology_type = 'external_api',
  model_key = 'process_query_ai_model',
  prompt_size_factor = 0.8
WHERE tool_type = 'process_query';

UPDATE public.credit_tool_costs SET
  technology_type = 'external_api',
  model_key = NULL,
  prompt_size_factor = 0.5
WHERE tool_type = 'process_monitor';

UPDATE public.credit_tool_costs SET
  technology_type = 'web_search',
  model_key = 'suin_juriscol_ai_model',
  reasoning_key = 'suin_juriscol_reasoning_effort',
  prompt_size_factor = 0.8
WHERE tool_type = 'suin_juriscol';

UPDATE public.credit_tool_costs SET
  technology_type = 'audio',
  model_key = 'voice_transcription_model',
  prompt_size_factor = 1.0
WHERE tool_type = 'voice_transcription';

UPDATE public.credit_tool_costs SET
  technology_type = 'text',
  model_key = 'copilot_ai_model',
  prompt_size_factor = 0.6
WHERE tool_type = 'legal_copilot';

UPDATE public.credit_tool_costs SET
  technology_type = 'text',
  model_key = 'case_predictor_ai_model',
  reasoning_key = 'reasoning_effort_strategy',
  prompt_size_factor = 1.5
WHERE tool_type = 'case_predictor';

UPDATE public.credit_tool_costs SET
  technology_type = 'external_api',
  prompt_size_factor = 0.8
WHERE tool_type = 'lawyer_verification';

UPDATE public.credit_tool_costs SET
  technology_type = 'text',
  model_key = 'crm_segmentation_ai_model',
  prompt_size_factor = 0.8
WHERE tool_type = 'crm_ai';

UPDATE public.credit_tool_costs SET
  technology_type = 'text',
  prompt_size_factor = 0.3
WHERE tool_type = 'spell_check';

UPDATE public.credit_tool_costs SET
  technology_type = 'text',
  prompt_size_factor = 0.5
WHERE tool_type = 'calendar_deadline';

-- Set base costs (minimum complexity units)
UPDATE public.credit_tool_costs SET base_cost = 2 WHERE tool_type = 'research';
UPDATE public.credit_tool_costs SET base_cost = 3 WHERE tool_type = 'draft';
UPDATE public.credit_tool_costs SET base_cost = 2 WHERE tool_type = 'analysis';
UPDATE public.credit_tool_costs SET base_cost = 3 WHERE tool_type = 'strategy';
UPDATE public.credit_tool_costs SET base_cost = 2 WHERE tool_type = 'process_query';
UPDATE public.credit_tool_costs SET base_cost = 1 WHERE tool_type = 'process_monitor';
UPDATE public.credit_tool_costs SET base_cost = 1 WHERE tool_type = 'suin_juriscol';
UPDATE public.credit_tool_costs SET base_cost = 2 WHERE tool_type = 'voice_transcription';
UPDATE public.credit_tool_costs SET base_cost = 2 WHERE tool_type = 'legal_copilot';
UPDATE public.credit_tool_costs SET base_cost = 4 WHERE tool_type = 'case_predictor';
UPDATE public.credit_tool_costs SET base_cost = 2 WHERE tool_type = 'lawyer_verification';
UPDATE public.credit_tool_costs SET base_cost = 1 WHERE tool_type = 'crm_ai';
UPDATE public.credit_tool_costs SET base_cost = 1 WHERE tool_type = 'spell_check';
UPDATE public.credit_tool_costs SET base_cost = 1 WHERE tool_type = 'calendar_deadline';

-- Create function to calculate tool cost
CREATE OR REPLACE FUNCTION public.calculate_tool_credit_cost(
  p_tool_type TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tool RECORD;
  v_model_multiplier DECIMAL := 1.0;
  v_reasoning_multiplier DECIMAL := 1.0;
  v_technology_multiplier DECIMAL := 1.0;
  v_prompt_multiplier DECIMAL := 1.0;
  v_platform_margin DECIMAL := 3.5;
  v_infrastructure DECIMAL := 1.2;
  v_model_value TEXT;
  v_reasoning_value TEXT;
  v_calculated_cost DECIMAL;
BEGIN
  -- Get tool configuration
  SELECT * INTO v_tool FROM credit_tool_costs WHERE tool_type = p_tool_type;
  
  IF v_tool IS NULL THEN
    RETURN 1;
  END IF;
  
  -- If auto_calculate is false, return current cost
  IF NOT COALESCE(v_tool.auto_calculate, true) THEN
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
  
  -- Get prompt size factor (already stored as decimal in tool)
  v_prompt_multiplier := COALESCE(v_tool.prompt_size_factor, 1.0);
  
  -- Get platform margins
  SELECT cost_multiplier INTO v_platform_margin 
  FROM cost_calculation_config 
  WHERE config_type = 'margin' AND config_key = 'platform_margin';
  
  SELECT cost_multiplier INTO v_infrastructure 
  FROM cost_calculation_config 
  WHERE config_type = 'margin' AND config_key = 'infrastructure_overhead';
  
  -- Calculate cost
  -- Formula: base_cost * model * reasoning * technology * prompt_size * platform_margin * infrastructure
  v_calculated_cost := COALESCE(v_tool.base_cost, 1) 
    * COALESCE(v_model_multiplier, 1.0)
    * COALESCE(v_reasoning_multiplier, 1.0)
    * COALESCE(v_technology_multiplier, 1.0)
    * v_prompt_multiplier
    * COALESCE(v_platform_margin, 3.5)
    * COALESCE(v_infrastructure, 1.2);
  
  -- Return rounded to nearest integer, minimum 1
  RETURN GREATEST(1, ROUND(v_calculated_cost)::INTEGER);
END;
$$;

-- Create function to recalculate all tool costs
CREATE OR REPLACE FUNCTION public.recalculate_all_tool_costs()
RETURNS TABLE(tool_type TEXT, old_cost INTEGER, new_cost INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tool RECORD;
  v_new_cost INTEGER;
BEGIN
  FOR v_tool IN SELECT * FROM credit_tool_costs WHERE auto_calculate = true LOOP
    v_new_cost := calculate_tool_credit_cost(v_tool.tool_type);
    
    -- Only update if cost changed
    IF v_new_cost != v_tool.credit_cost THEN
      UPDATE credit_tool_costs 
      SET credit_cost = v_new_cost, updated_at = now() 
      WHERE id = v_tool.id;
      
      tool_type := v_tool.tool_type;
      old_cost := v_tool.credit_cost;
      new_cost := v_new_cost;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- Create trigger to recalculate costs when system_config changes
CREATE OR REPLACE FUNCTION public.on_system_config_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only recalculate for model or reasoning config changes
  IF NEW.config_key LIKE '%_model%' OR NEW.config_key LIKE '%reasoning%' THEN
    PERFORM recalculate_all_tool_costs();
    RAISE LOG '[COST] Tool costs recalculated due to config change: %', NEW.config_key;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on system_config
DROP TRIGGER IF EXISTS trigger_recalculate_tool_costs ON system_config;
CREATE TRIGGER trigger_recalculate_tool_costs
AFTER UPDATE ON system_config
FOR EACH ROW
EXECUTE FUNCTION on_system_config_change();

-- Also recalculate when cost_calculation_config changes
CREATE OR REPLACE FUNCTION public.on_cost_config_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM recalculate_all_tool_costs();
  RAISE LOG '[COST] Tool costs recalculated due to cost config change: % - %', NEW.config_type, NEW.config_key;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cost_config_change ON cost_calculation_config;
CREATE TRIGGER trigger_cost_config_change
AFTER INSERT OR UPDATE ON cost_calculation_config
FOR EACH ROW
EXECUTE FUNCTION on_cost_config_change();

-- Recalculate all costs now
SELECT * FROM recalculate_all_tool_costs();
