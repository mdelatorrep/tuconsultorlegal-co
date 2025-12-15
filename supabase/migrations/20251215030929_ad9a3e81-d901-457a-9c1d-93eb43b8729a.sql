-- Crear job para generar el OpenAI assistant del agente Carta de Renuncia
INSERT INTO openai_agent_jobs (legal_agent_id, status, created_at)
VALUES ('c11e3da6-ed4c-456e-8a52-c6cccb6c0487', 'pending', now())
ON CONFLICT DO NOTHING;