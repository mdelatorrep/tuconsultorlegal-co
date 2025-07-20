-- Create table for legal advisor agents (different from document generators)
CREATE TABLE public.legal_advisor_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  specialization TEXT NOT NULL CHECK (specialization IN ('civil', 'comercial', 'laboral', 'penal', 'administrativo', 'tributario', 'familia', 'societario')),
  target_audience TEXT NOT NULL CHECK (target_audience IN ('personas', 'empresas', 'ambos')),
  openai_agent_id TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL DEFAULT 'gpt-4o',
  instructions TEXT NOT NULL,
  legal_sources JSONB DEFAULT '[]', -- URLs de fuentes legales específicas
  search_keywords JSONB DEFAULT '[]', -- Keywords para búsquedas especializadas
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for advisor consultations
CREATE TABLE public.legal_consultations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_agent_id UUID REFERENCES public.legal_advisor_agents(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL, -- OpenAI thread ID
  user_session_id TEXT,
  consultation_topic TEXT,
  legal_area TEXT,
  consultation_data JSONB DEFAULT '{}',
  sources_consulted JSONB DEFAULT '[]', -- Legal sources found and consulted
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_advisor_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_consultations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public access to advisor agents" 
ON public.legal_advisor_agents 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Service role can manage advisor agents" 
ON public.legal_advisor_agents 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Public access to consultations" 
ON public.legal_consultations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_legal_advisor_agents_specialization ON public.legal_advisor_agents(specialization);
CREATE INDEX idx_legal_advisor_agents_target_audience ON public.legal_advisor_agents(target_audience);
CREATE INDEX idx_legal_consultations_thread_id ON public.legal_consultations(thread_id);
CREATE INDEX idx_legal_consultations_legal_area ON public.legal_consultations(legal_area);

-- Triggers for timestamps
CREATE TRIGGER update_legal_advisor_agents_updated_at
BEFORE UPDATE ON public.legal_advisor_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_consultations_updated_at
BEFORE UPDATE ON public.legal_consultations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert specialized advisor agents
INSERT INTO public.legal_advisor_agents (name, specialization, target_audience, openai_agent_id, instructions, legal_sources, search_keywords) VALUES
(
  'Asesor Civil para Personas',
  'civil',
  'personas',
  'temp_civil_personas', -- Will be replaced with actual OpenAI agent ID
  'Especialista en derecho civil para personas naturales',
  '["https://www.funcionpublica.gov.co", "https://www.corteconstitucional.gov.co", "https://www.alcaldiabogota.gov.co"]',
  '["código civil", "derecho civil", "personas naturales", "contratos civiles", "responsabilidad civil"]'
),
(
  'Asesor Comercial para Empresas',
  'comercial',
  'empresas',
  'temp_comercial_empresas',
  'Especialista en derecho comercial y societario para empresas',
  '["https://www.supersociedades.gov.co", "https://www.sic.gov.co", "https://www.funcionpublica.gov.co"]',
  '["código de comercio", "derecho comercial", "sociedades", "registro mercantil", "empresa"]'
),
(
  'Asesor Laboral Universal',
  'laboral',
  'ambos',
  'temp_laboral_ambos',
  'Especialista en derecho laboral para empleadores y trabajadores',
  '["https://www.mintrabajo.gov.co", "https://www.funcionpublica.gov.co"]',
  '["código sustantivo del trabajo", "derecho laboral", "contratos trabajo", "salarios", "prestaciones"]'
);