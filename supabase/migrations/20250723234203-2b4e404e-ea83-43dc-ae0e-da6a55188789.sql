-- Crear tabla para la base de conocimiento de URLs permitidas
CREATE TABLE public.knowledge_base_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_verified TIMESTAMP WITH TIME ZONE,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  tags TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  UNIQUE(url)
);

-- Habilitar RLS
ALTER TABLE public.knowledge_base_urls ENABLE ROW LEVEL SECURITY;

-- Crear políticas
CREATE POLICY "Service role can manage knowledge base URLs" 
ON public.knowledge_base_urls 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Crear función para actualizar updated_at
CREATE TRIGGER update_knowledge_base_urls_updated_at
  BEFORE UPDATE ON public.knowledge_base_urls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_knowledge_base_urls_category ON public.knowledge_base_urls(category);
CREATE INDEX idx_knowledge_base_urls_active ON public.knowledge_base_urls(is_active);
CREATE INDEX idx_knowledge_base_urls_verification ON public.knowledge_base_urls(verification_status);
CREATE INDEX idx_knowledge_base_urls_tags ON public.knowledge_base_urls USING GIN(tags);

-- Insertar algunas URLs de ejemplo para legislación colombiana
INSERT INTO public.knowledge_base_urls (url, description, category, tags, priority) VALUES 
('https://www.funcionpublica.gov.co', 'Portal oficial de la Función Pública de Colombia', 'legislacion', ARRAY['gobierno', 'legislacion', 'oficial'], 5),
('https://www.corteconstitucional.gov.co', 'Corte Constitucional de Colombia', 'jurisprudencia', ARRAY['corte', 'constitucional', 'sentencias'], 5),
('https://www.consejodeestado.gov.co', 'Consejo de Estado de Colombia', 'jurisprudencia', ARRAY['consejo', 'estado', 'contencioso'], 5),
('https://www.cortesuprema.gov.co', 'Corte Suprema de Justicia de Colombia', 'jurisprudencia', ARRAY['corte', 'suprema', 'casacion'], 5),
('https://www.alcaldiabogota.gov.co', 'Alcaldía Mayor de Bogotá D.C.', 'normatividad', ARRAY['bogota', 'distrito', 'local'], 4);