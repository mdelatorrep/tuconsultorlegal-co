-- 1. Add is_billable configurations in system_config for each tool
INSERT INTO system_config (config_key, config_value, description) VALUES
-- Tools that ARE billable (lawyer portal features)
('is_billable_analysis', true, 'Análisis de documentos es facturable'),
('is_billable_draft', true, 'Redacción legal es facturable'),
('is_billable_research', true, 'Investigación legal es facturable'),
('is_billable_strategy', true, 'Estrategia legal es facturable'),
('is_billable_process_query', true, 'Consulta procesos judiciales es facturable'),
('is_billable_process_monitor', true, 'Monitor de procesos es facturable'),
('is_billable_suin_juriscol', true, 'SUIN-Juriscol es facturable'),
('is_billable_case_predictor', true, 'Predictor de casos es facturable'),
('is_billable_legal_copilot', true, 'Copilot legal es facturable'),
('is_billable_spell_check', true, 'Corrector ortográfico es facturable'),
('is_billable_calendar_deadline', true, 'Cálculo de términos es facturable'),
('is_billable_voice_transcription', true, 'Transcripción de voz es facturable'),
('is_billable_lawyer_verification', true, 'Verificación profesional es facturable'),
('is_billable_crm_ai', true, 'CRM con IA es facturable'),
('is_billable_training', true, 'Asistente de entrenamiento es facturable'),
-- Tools that are NOT billable (internal platform functions)
('is_billable_document_chat', false, 'Chat de documentos públicos NO es facturable'),
('is_billable_suggest_blocks', false, 'Sugerencia de bloques NO es facturable'),
('is_billable_routing', false, 'Routing interno NO es facturable'),
('is_billable_lexi', false, 'Asistente Lexi interno NO es facturable'),
('is_billable_improve_clause', false, 'Mejora de cláusulas NO es facturable'),
('is_billable_organize_file', false, 'Organizar archivos NO es facturable')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, description = EXCLUDED.description;

-- 2. Delete non-billable tools from credit_tool_costs
DELETE FROM credit_tool_costs 
WHERE tool_type IN ('document_chat', 'suggest_blocks', 'routing', 'lexi', 'improve_clause', 'organize_file');

-- 3. Update recalculate function to check is_billable before inserting
CREATE OR REPLACE FUNCTION public.sync_billable_tool_costs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_config RECORD;
  v_tool_type TEXT;
  v_is_billable BOOLEAN;
BEGIN
  -- Check each is_billable config
  FOR v_config IN 
    SELECT config_key, config_value 
    FROM system_config 
    WHERE config_key LIKE 'is_billable_%'
  LOOP
    v_tool_type := REPLACE(v_config.config_key, 'is_billable_', '');
    v_is_billable := (v_config.config_value)::boolean;
    
    IF v_is_billable THEN
      -- Tool should exist in credit_tool_costs, recalculate if exists
      IF EXISTS (SELECT 1 FROM credit_tool_costs WHERE tool_type = v_tool_type) THEN
        PERFORM calculate_tool_credit_cost(v_tool_type);
      END IF;
    ELSE
      -- Tool should NOT exist in credit_tool_costs
      DELETE FROM credit_tool_costs WHERE tool_type = v_tool_type;
      RAISE LOG '[BILLING] Removed non-billable tool from costs: %', v_tool_type;
    END IF;
  END LOOP;
END;
$function$;

-- 4. Update the system config change trigger to also sync billable status
CREATE OR REPLACE FUNCTION public.on_system_config_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Handle is_billable changes
  IF NEW.config_key LIKE 'is_billable_%' THEN
    PERFORM sync_billable_tool_costs();
    RAISE LOG '[BILLING] Billable status synced due to config change: %', NEW.config_key;
  -- Handle model or reasoning config changes
  ELSIF NEW.config_key LIKE '%_model%' OR NEW.config_key LIKE '%reasoning%' THEN
    PERFORM recalculate_all_tool_costs();
    RAISE LOG '[COST] Tool costs recalculated due to config change: %', NEW.config_key;
  END IF;
  RETURN NEW;
END;
$function$;