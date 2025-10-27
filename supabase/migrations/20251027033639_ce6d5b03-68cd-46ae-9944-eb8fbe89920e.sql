-- Crear tabla para documentos guardados de abogados
CREATE TABLE IF NOT EXISTS public.lawyer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL REFERENCES lawyer_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  content TEXT NOT NULL,
  markdown_content TEXT,
  is_monetized BOOLEAN DEFAULT false,
  monetized_agent_id UUID REFERENCES legal_agents(id) ON DELETE SET NULL,
  price INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.lawyer_documents ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Lawyers can view their own documents"
  ON public.lawyer_documents
  FOR SELECT
  USING (auth.uid() = lawyer_id);

CREATE POLICY "Lawyers can create their own documents"
  ON public.lawyer_documents
  FOR INSERT
  WITH CHECK (auth.uid() = lawyer_id);

CREATE POLICY "Lawyers can update their own documents"
  ON public.lawyer_documents
  FOR UPDATE
  USING (auth.uid() = lawyer_id);

CREATE POLICY "Lawyers can delete their own documents"
  ON public.lawyer_documents
  FOR DELETE
  USING (auth.uid() = lawyer_id);

CREATE POLICY "Service role can manage all lawyer documents"
  ON public.lawyer_documents
  FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger para actualizar updated_at
CREATE TRIGGER update_lawyer_documents_updated_at
  BEFORE UPDATE ON public.lawyer_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar el rendimiento
CREATE INDEX idx_lawyer_documents_lawyer_id ON public.lawyer_documents(lawyer_id);
CREATE INDEX idx_lawyer_documents_is_monetized ON public.lawyer_documents(is_monetized);
CREATE INDEX idx_lawyer_documents_created_at ON public.lawyer_documents(created_at DESC);