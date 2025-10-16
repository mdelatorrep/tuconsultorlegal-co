-- Opción 3: Limpiar agentes OpenAI duplicados
-- Desactivar todos excepto el más reciente por legal_agent_id

UPDATE openai_agents oa1
SET status = 'inactive'
WHERE status = 'active'
AND created_at < (
  SELECT MAX(created_at)
  FROM openai_agents oa2
  WHERE oa2.legal_agent_id = oa1.legal_agent_id
  AND oa2.status = 'active'
);