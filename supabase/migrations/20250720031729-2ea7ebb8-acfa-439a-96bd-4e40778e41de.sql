-- Create OpenAI Agents architecture tables

-- Table for OpenAI Agent instances
CREATE TABLE public.openai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legal_agent_id UUID REFERENCES public.legal_agents(id) ON DELETE CASCADE,
  openai_agent_id TEXT NOT NULL, -- OpenAI's agent ID
  name TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gpt-4o',
  instructions TEXT NOT NULL,
  tools JSONB DEFAULT '[]',
  tool_resources JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(openai_agent_id)
);

-- Table for agent interactions and conversations
CREATE TABLE public.agent_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  openai_agent_id UUID REFERENCES public.openai_agents(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL, -- OpenAI thread ID
  user_session_id TEXT,
  document_token_id UUID REFERENCES public.document_tokens(id) ON DELETE SET NULL,
  conversation_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for multi-agent workflow orchestration
CREATE TABLE public.agent_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('document_generation', 'quality_validation', 'legal_compliance')),
  agents_config JSONB NOT NULL DEFAULT '[]', -- Array of agent configurations
  execution_steps JSONB NOT NULL DEFAULT '[]', -- Workflow steps
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for workflow executions
CREATE TABLE public.workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES public.agent_workflows(id) ON DELETE CASCADE,
  document_token_id UUID REFERENCES public.document_tokens(id) ON DELETE CASCADE,
  execution_data JSONB DEFAULT '{}',
  current_step INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.openai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

-- Policies for openai_agents
CREATE POLICY "Service role can manage OpenAI agents" 
ON public.openai_agents 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Policies for agent_conversations
CREATE POLICY "Service role can manage conversations" 
ON public.agent_conversations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Policies for agent_workflows
CREATE POLICY "Service role can manage workflows" 
ON public.agent_workflows 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Policies for workflow_executions
CREATE POLICY "Service role can manage workflow executions" 
ON public.workflow_executions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_openai_agents_legal_agent_id ON public.openai_agents(legal_agent_id);
CREATE INDEX idx_openai_agents_status ON public.openai_agents(status);
CREATE INDEX idx_agent_conversations_thread_id ON public.agent_conversations(thread_id);
CREATE INDEX idx_agent_conversations_openai_agent_id ON public.agent_conversations(openai_agent_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_openai_agents_updated_at
BEFORE UPDATE ON public.openai_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_conversations_updated_at
BEFORE UPDATE ON public.agent_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_workflows_updated_at
BEFORE UPDATE ON public.agent_workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default workflows
INSERT INTO public.agent_workflows (name, description, workflow_type, agents_config, execution_steps) VALUES
(
  'Generación de Documentos con Validación',
  'Workflow completo para generar documentos legales con validación automática de calidad',
  'document_generation',
  '[
    {
      "role": "generator",
      "name": "Document Generator",
      "model": "gpt-4o",
      "tools": ["function"],
      "responsibilities": ["Generar documento basado en template y datos del usuario"]
    },
    {
      "role": "validator",
      "name": "Quality Validator", 
      "model": "gpt-4o",
      "tools": ["function"],
      "responsibilities": ["Validar calidad, coherencia y completitud del documento"]
    },
    {
      "role": "compliance",
      "name": "Legal Compliance Checker",
      "model": "gpt-4o", 
      "tools": ["function", "web_search"],
      "responsibilities": ["Verificar cumplimiento legal y normativo"]
    }
  ]',
  '[
    {
      "step": 1,
      "agent_role": "generator",
      "action": "generate_document",
      "description": "Generar documento inicial basado en template"
    },
    {
      "step": 2,
      "agent_role": "validator",
      "action": "validate_quality",
      "description": "Validar calidad y coherencia del documento"
    },
    {
      "step": 3,
      "agent_role": "compliance",
      "action": "check_compliance",
      "description": "Verificar cumplimiento legal"
    },
    {
      "step": 4,
      "agent_role": "generator",
      "action": "final_revision",
      "description": "Aplicar correcciones finales si es necesario"
    }
  ]'
),
(
  'Validación de Calidad Avanzada',
  'Workflow especializado en validación exhaustiva de documentos legales',
  'quality_validation',
  '[
    {
      "role": "content_validator",
      "name": "Content Quality Checker",
      "model": "gpt-4o",
      "responsibilities": ["Validar contenido, gramática y estilo"]
    },
    {
      "role": "legal_validator", 
      "name": "Legal Content Validator",
      "model": "gpt-4o",
      "responsibilities": ["Validar aspectos legales específicos"]
    }
  ]',
  '[
    {
      "step": 1,
      "agent_role": "content_validator",
      "action": "validate_content",
      "description": "Validar contenido y estructura"
    },
    {
      "step": 2,
      "agent_role": "legal_validator",
      "action": "validate_legal_aspects",
      "description": "Validar aspectos legales"
    }
  ]'
);