-- Update suin_juriscol_reasoning_effort to 'low' as configured
UPDATE public.system_config 
SET config_value = 'low', updated_at = now()
WHERE config_key = 'suin_juriscol_reasoning_effort';