-- ============================================================================
-- SPECIALIZED AGENTS CATALOG
-- System for admin-managed AI agents using OpenAI Agent Builder
-- Completely separate from document generation agents (legal_agents table)
-- ============================================================================

-- Create catalog table for specialized agents
CREATE TABLE public.specialized_agents_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT, -- For card display
  category TEXT NOT NULL DEFAULT 'general', -- laboral, civil, comercial, tributario, etc.
  target_audience TEXT NOT NULL DEFAULT 'ambos', -- personas, empresas, ambos
  icon TEXT DEFAULT 'Bot', -- Lucide icon name
  color_class TEXT DEFAULT 'bg-blue-500', -- Tailwind color class
  
  -- OpenAI Agent Builder integration
  openai_workflow_id TEXT, -- Workflow ID from Agent Builder (optional if using direct API)
  openai_assistant_id TEXT, -- Assistant ID if using Assistants API
  agent_instructions TEXT, -- System instructions for the agent
  agent_tools JSONB DEFAULT '[]'::jsonb, -- Tools enabled for this agent
  
  -- Configuration
  credits_per_session INTEGER DEFAULT 1,
  max_messages_per_session INTEGER DEFAULT 50,
  is_premium BOOLEAN DEFAULT false,
  requires_subscription TEXT DEFAULT NULL, -- NULL = free, 'basico', 'profesional', 'enterprise'
  
  -- Status and display
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive, draft
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  
  -- Metadata
  usage_count INTEGER DEFAULT 0,
  avg_rating NUMERIC(2,1) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_specialized_agents_status ON specialized_agents_catalog(status);
CREATE INDEX idx_specialized_agents_category ON specialized_agents_catalog(category);

-- Enable RLS
ALTER TABLE specialized_agents_catalog ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active specialized agents"
  ON specialized_agents_catalog FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage specialized agents"
  ON specialized_agents_catalog FOR ALL
  USING (EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE admin_profiles.user_id = auth.uid()
    AND admin_profiles.active = true
  ));

CREATE POLICY "Service role can manage specialized agents"
  ON specialized_agents_catalog FOR ALL
  USING (auth.role() = 'service_role');

-- Chat sessions tracking table
CREATE TABLE public.specialized_agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES specialized_agents_catalog(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL,
  thread_id TEXT, -- OpenAI thread ID if using Assistants API
  
  -- Session metrics
  messages_count INTEGER DEFAULT 0,
  credits_consumed INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  
  -- User feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  
  -- Conversation data
  conversation_summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_agent_sessions_lawyer ON specialized_agent_sessions(lawyer_id);
CREATE INDEX idx_agent_sessions_agent ON specialized_agent_sessions(agent_id);

-- Enable RLS
ALTER TABLE specialized_agent_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessions
CREATE POLICY "Lawyers can view their own sessions"
  ON specialized_agent_sessions FOR SELECT
  USING (auth.uid() = lawyer_id);

CREATE POLICY "Lawyers can create sessions"
  ON specialized_agent_sessions FOR INSERT
  WITH CHECK (auth.uid() = lawyer_id);

CREATE POLICY "Lawyers can update their own sessions"
  ON specialized_agent_sessions FOR UPDATE
  USING (auth.uid() = lawyer_id);

CREATE POLICY "Admins can view all sessions"
  ON specialized_agent_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE admin_profiles.user_id = auth.uid()
    AND admin_profiles.active = true
  ));

CREATE POLICY "Service role can manage sessions"
  ON specialized_agent_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- Insert sample specialized agents
INSERT INTO specialized_agents_catalog (name, description, short_description, category, target_audience, icon, color_class, agent_instructions, is_featured, display_order) VALUES
  ('Asesor Laboral', 'Especialista en derecho laboral colombiano. Ayuda con contratos, despidos, liquidaciones, prestaciones sociales, y consultas sobre el Código Sustantivo del Trabajo.', 'Experto en derecho laboral y relaciones empleador-empleado', 'laboral', 'ambos', 'Briefcase', 'bg-amber-500', 'Eres un experto en derecho laboral colombiano. Ayudas a usuarios con consultas sobre contratos laborales, despidos, liquidaciones, prestaciones sociales, y normativas del Código Sustantivo del Trabajo. Siempre citas las normas aplicables y recomiendas consultar con un abogado para casos específicos.', true, 1),
  
  ('Asesor Civil', 'Experto en derecho civil colombiano. Resuelve dudas sobre contratos, bienes, familia, sucesiones, y responsabilidad civil.', 'Especialista en contratos, familia y sucesiones', 'civil', 'personas', 'Scale', 'bg-blue-500', 'Eres un experto en derecho civil colombiano. Ayudas con consultas sobre contratos civiles, derecho de familia, sucesiones, bienes, y responsabilidad civil. Citas el Código Civil colombiano y jurisprudencia relevante.', true, 2),
  
  ('Asesor Comercial', 'Especialista en derecho comercial y societario. Asesora sobre constitución de empresas, contratos mercantiles, y obligaciones comerciales.', 'Experto en sociedades y contratos mercantiles', 'comercial', 'empresas', 'Building2', 'bg-purple-500', 'Eres un experto en derecho comercial colombiano. Ayudas con constitución de sociedades, contratos mercantiles, obligaciones comerciales, y normativas del Código de Comercio. Orientas sobre trámites en Cámaras de Comercio y Superintendencias.', true, 3),
  
  ('Asesor Tributario', 'Experto en derecho tributario colombiano. Orienta sobre impuestos, declaraciones, DIAN, y obligaciones fiscales.', 'Especialista en impuestos y obligaciones fiscales', 'tributario', 'ambos', 'Receipt', 'bg-green-500', 'Eres un experto en derecho tributario colombiano. Ayudas con consultas sobre impuestos (renta, IVA, retención en la fuente), obligaciones ante la DIAN, y planificación fiscal legal. Citas el Estatuto Tributario y normativas vigentes.', false, 4),
  
  ('Asesor Administrativo', 'Especialista en derecho administrativo. Asesora sobre trámites con entidades públicas, contratación estatal, y derechos ciudadanos.', 'Experto en trámites públicos y contratación estatal', 'administrativo', 'ambos', 'Landmark', 'bg-slate-500', 'Eres un experto en derecho administrativo colombiano. Ayudas con trámites ante entidades públicas, contratación estatal, derechos de petición, y acciones constitucionales. Citas el CPACA y normativas aplicables.', false, 5),
  
  ('Asesor Penal', 'Orientación general en derecho penal colombiano. Explica procedimientos, derechos del procesado, y conceptos penales básicos.', 'Orientación en procedimientos y derechos penales', 'penal', 'personas', 'Shield', 'bg-red-500', 'Eres un orientador en derecho penal colombiano. Explicas procedimientos penales, derechos del procesado, tipos de delitos, y etapas del proceso. SIEMPRE recomiendas buscar un abogado penalista para casos específicos. No das asesoría legal específica en casos penales.', false, 6);

-- Trigger to update usage count
CREATE OR REPLACE FUNCTION update_agent_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE specialized_agents_catalog
  SET usage_count = usage_count + 1, updated_at = now()
  WHERE id = NEW.agent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_agent_usage
AFTER INSERT ON specialized_agent_sessions
FOR EACH ROW
EXECUTE FUNCTION update_agent_usage_count();