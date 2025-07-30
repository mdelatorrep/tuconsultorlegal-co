-- 1. Habilitar OpenAI agents para los agentes existentes
-- Crear OpenAI agent para Contrato de Arrendamiento
INSERT INTO public.openai_agent_jobs (
  legal_agent_id,
  status,
  created_at
) VALUES (
  '1bd06374-ae94-49cb-b1f2-0900f2685d8e',
  'pending',
  NOW()
);

-- Crear OpenAI agent para Carta de Renuncia  
INSERT INTO public.openai_agent_jobs (
  legal_agent_id,
  status,
  created_at
) VALUES (
  '2a03bb5a-c0e2-446f-add4-f12c546510b3',
  'pending',
  NOW()
);

-- 2. Asegurar que el trigger existe para auto-crear agentes OpenAI
-- El trigger ya existe pero vamos a verificar que esté activo
DROP TRIGGER IF EXISTS trigger_auto_create_openai_agent ON public.legal_agents;

CREATE TRIGGER trigger_auto_create_openai_agent
  AFTER INSERT OR UPDATE ON public.legal_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_openai_agent();

-- Habilitar OpenAI para los agentes existentes
UPDATE public.legal_agents 
SET openai_enabled = true 
WHERE id IN (
  '1bd06374-ae94-49cb-b1f2-0900f2685d8e',
  '2a03bb5a-c0e2-446f-add4-f12c546510b3'
);