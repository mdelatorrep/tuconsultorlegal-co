-- Fase 1: Limpieza de duplicados y prevención

-- Paso 1: Eliminar todos los duplicados existentes en agent_conversations
-- Mantenemos solo el registro más reciente de cada combinación thread_id + openai_agent_id
DELETE FROM agent_conversations
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY thread_id, openai_agent_id ORDER BY updated_at DESC) as rn
    FROM agent_conversations
  ) t
  WHERE rn > 1
);

-- Paso 2: Crear constraint único para prevenir duplicados futuros
-- Esto garantiza que no puede haber dos registros con el mismo thread_id y openai_agent_id
ALTER TABLE agent_conversations 
ADD CONSTRAINT unique_thread_agent UNIQUE (thread_id, openai_agent_id);

-- Paso 3: Crear función para hacer merge de JSONB (necesaria para UPSERT)
CREATE OR REPLACE FUNCTION public.jsonb_merge(existing JSONB, new JSONB)
RETURNS JSONB
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT COALESCE(existing, '{}'::jsonb) || COALESCE(new, '{}'::jsonb);
$$;

-- Log de la migración
COMMENT ON CONSTRAINT unique_thread_agent ON agent_conversations IS 
  'Prevents duplicate conversations for the same thread and agent combination';

COMMENT ON FUNCTION public.jsonb_merge IS 
  'Merges two JSONB objects, with new values overwriting existing ones';