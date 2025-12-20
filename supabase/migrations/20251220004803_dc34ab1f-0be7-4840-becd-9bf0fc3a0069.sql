-- Add process_query to tool_type constraint
ALTER TABLE public.legal_tools_results
DROP CONSTRAINT IF EXISTS legal_tools_results_tool_type_check;

ALTER TABLE public.legal_tools_results
ADD CONSTRAINT legal_tools_results_tool_type_check
CHECK (tool_type = ANY (ARRAY['research'::text, 'analysis'::text, 'draft'::text, 'integration'::text, 'suin_juriscol'::text, 'process_query'::text]));

-- Add system config for process query
INSERT INTO public.system_config (config_key, config_value, description)
VALUES 
  ('process_query_ai_model', 'gpt-4.1-2025-04-14', 'Modelo de IA para consultas de procesos judiciales'),
  ('process_query_ai_prompt', 'Eres un asistente legal especializado en consultas de procesos judiciales de Colombia.', 'Prompt del sistema para consultas de procesos')
ON CONFLICT (config_key) DO NOTHING;

-- Add official URLs to knowledge base
INSERT INTO public.knowledge_base_urls (url, description, category, is_active)
VALUES 
  ('https://consultaprocesos.ramajudicial.gov.co', 'Portal oficial de consulta de procesos judiciales', 'judicial', true),
  ('https://www.ramajudicial.gov.co', 'Página principal de la Rama Judicial de Colombia', 'judicial', true)
ON CONFLICT (url) DO NOTHING;