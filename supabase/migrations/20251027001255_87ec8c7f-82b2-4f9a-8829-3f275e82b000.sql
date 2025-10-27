-- Agregar campo para rastrear el agente que generó el documento
ALTER TABLE public.document_tokens 
ADD COLUMN legal_agent_id uuid REFERENCES public.legal_agents(id) ON DELETE SET NULL;

-- Crear índice para mejorar búsquedas
CREATE INDEX idx_document_tokens_legal_agent_id ON public.document_tokens(legal_agent_id);

COMMENT ON COLUMN public.document_tokens.legal_agent_id IS 'ID del agente legal que generó este documento';