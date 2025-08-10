-- Step 1: Copy tuconsultorlegal_agent_dna -> agent_creation_system_prompt safely
-- Update if row exists
WITH dna AS (
  SELECT config_value
  FROM public.system_config
  WHERE config_key = 'tuconsultorlegal_agent_dna'
  ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  LIMIT 1
)
UPDATE public.system_config sc
SET config_value = dna.config_value,
    description = COALESCE(sc.description, 'Base system prompt used when creating agents')
FROM dna
WHERE sc.config_key = 'agent_creation_system_prompt';

-- Insert if missing and dna exists
INSERT INTO public.system_config (config_key, config_value, description)
SELECT 'agent_creation_system_prompt', dna.config_value, 'Base system prompt used when creating agents'
FROM (
  SELECT config_value
  FROM public.system_config
  WHERE config_key = 'tuconsultorlegal_agent_dna'
  ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  LIMIT 1
) dna
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_config WHERE config_key = 'agent_creation_system_prompt'
)
AND dna.config_value IS NOT NULL;