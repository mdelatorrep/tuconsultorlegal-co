-- Insert system configurations for SUIN-Juriscol AI tool
INSERT INTO system_config (config_key, config_value, description)
VALUES 
  ('suin_juriscol_ai_model', 'gpt-4.1-2025-04-14', 'Modelo de IA para búsquedas en SUIN-Juriscol'),
  ('suin_juriscol_ai_prompt', 'Eres un asistente legal especializado en consultar el Sistema Único de Información Normativa de Colombia (SUIN-Juriscol).

Tu trabajo es:
1. Buscar información normativa colombiana relevante usando web search
2. Priorizar resultados del dominio oficial: suin-juriscol.gov.co
3. También considerar fuentes oficiales como: corteconstitucional.gov.co, funcionpublica.gov.co, secretariasenado.gov.co
4. Analizar y resumir los hallazgos de manera clara para abogados
5. Identificar leyes, decretos, resoluciones, sentencias y conceptos relevantes

IMPORTANTE:
- Siempre cita la fuente exacta (número de ley/decreto, fecha, artículos relevantes)
- Prioriza información vigente sobre derogada
- Indica claramente si una norma ha sido modificada o derogada
- Responde en español

Formato de respuesta:
- Proporciona un resumen ejecutivo de 2-3 párrafos
- Lista los documentos normativos encontrados con sus URLs
- Incluye citas específicas de artículos relevantes cuando sea posible', 'Prompt del sistema para la herramienta SUIN-Juriscol')
ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = now();

-- Add SUIN-Juriscol domain to knowledge_base_urls if not exists (without priority to avoid constraint issues)
INSERT INTO knowledge_base_urls (url, description, category, is_active, verification_status)
VALUES 
  ('https://www.suin-juriscol.gov.co', 'Sistema Único de Información Normativa - Colombia', 'normativa', true, 'verified'),
  ('https://www.corteconstitucional.gov.co', 'Corte Constitucional de Colombia', 'jurisprudencia', true, 'verified'),
  ('https://www.funcionpublica.gov.co', 'Función Pública - Colombia', 'normativa', true, 'verified'),
  ('https://www.secretariasenado.gov.co', 'Secretaría del Senado - Leyes', 'normativa', true, 'verified')
ON CONFLICT (url) DO NOTHING;