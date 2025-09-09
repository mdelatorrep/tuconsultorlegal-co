-- Crear tablas para el módulo CRM
CREATE TABLE public.crm_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  address TEXT,
  client_type TEXT NOT NULL DEFAULT 'individual',
  status TEXT NOT NULL DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.crm_clients(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL,
  case_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  case_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT NOT NULL DEFAULT 'medium',
  start_date DATE,
  end_date DATE,
  billing_rate DECIMAL(10,2),
  estimated_hours INTEGER,
  actual_hours INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.crm_clients(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.crm_cases(id) ON DELETE SET NULL,
  lawyer_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'email',
  subject TEXT,
  content TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'outbound',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.crm_clients(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.crm_cases(id) ON DELETE SET NULL,
  lawyer_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  tags TEXT[] DEFAULT '{}',
  is_confidential BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.crm_clients(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.crm_cases(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_client_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '{}',
  ai_generated BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  trigger_conditions JSONB DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_execution TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.crm_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_client_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automation_rules ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Lawyers can manage their own CRM clients" ON public.crm_clients
  FOR ALL USING (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can manage their own CRM cases" ON public.crm_cases
  FOR ALL USING (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can manage their own CRM communications" ON public.crm_communications
  FOR ALL USING (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can manage their own CRM documents" ON public.crm_documents
  FOR ALL USING (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can manage their own CRM tasks" ON public.crm_tasks
  FOR ALL USING (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can manage their own client segments" ON public.crm_client_segments
  FOR ALL USING (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can manage their own automation rules" ON public.crm_automation_rules
  FOR ALL USING (lawyer_id = auth.uid());

-- Service role can manage all CRM data
CREATE POLICY "Service role can manage all CRM data" ON public.crm_clients
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all CRM cases" ON public.crm_cases
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all CRM communications" ON public.crm_communications
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all CRM documents" ON public.crm_documents
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all CRM tasks" ON public.crm_tasks
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all client segments" ON public.crm_client_segments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all automation rules" ON public.crm_automation_rules
  FOR ALL USING (auth.role() = 'service_role');

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_crm_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_crm_clients_updated_at
  BEFORE UPDATE ON public.crm_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_crm_updated_at();

CREATE TRIGGER update_crm_cases_updated_at
  BEFORE UPDATE ON public.crm_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_crm_updated_at();

CREATE TRIGGER update_crm_communications_updated_at
  BEFORE UPDATE ON public.crm_communications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_crm_updated_at();

CREATE TRIGGER update_crm_documents_updated_at
  BEFORE UPDATE ON public.crm_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_crm_updated_at();

CREATE TRIGGER update_crm_tasks_updated_at
  BEFORE UPDATE ON public.crm_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_crm_updated_at();

CREATE TRIGGER update_crm_client_segments_updated_at
  BEFORE UPDATE ON public.crm_client_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_crm_updated_at();

CREATE TRIGGER update_crm_automation_rules_updated_at
  BEFORE UPDATE ON public.crm_automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_crm_updated_at();

-- Índices para mejorar performance
CREATE INDEX idx_crm_clients_lawyer_id ON public.crm_clients(lawyer_id);
CREATE INDEX idx_crm_clients_email ON public.crm_clients(email);
CREATE INDEX idx_crm_cases_client_id ON public.crm_cases(client_id);
CREATE INDEX idx_crm_cases_lawyer_id ON public.crm_cases(lawyer_id);
CREATE INDEX idx_crm_communications_client_id ON public.crm_communications(client_id);
CREATE INDEX idx_crm_communications_case_id ON public.crm_communications(case_id);
CREATE INDEX idx_crm_documents_client_id ON public.crm_documents(client_id);
CREATE INDEX idx_crm_tasks_client_id ON public.crm_tasks(client_id);
CREATE INDEX idx_crm_tasks_due_date ON public.crm_tasks(due_date);
CREATE INDEX idx_crm_automation_rules_lawyer_id ON public.crm_automation_rules(lawyer_id);