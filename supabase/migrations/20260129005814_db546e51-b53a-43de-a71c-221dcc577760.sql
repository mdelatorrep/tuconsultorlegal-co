-- =====================================================
-- FASE 1: REDISEÑO ESTRATÉGICO DEL CRM
-- Nuevos campos y tablas para Centro de Operaciones Legales
-- =====================================================

-- 1. Nuevos campos en crm_cases (Pipeline Visual)
ALTER TABLE public.crm_cases 
ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'inicial',
ADD COLUMN IF NOT EXISTS expected_value NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS next_action_date DATE,
ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS total_hours_worked NUMERIC(10, 2) DEFAULT 0;

-- 2. Nuevos campos en crm_clients (Client Success)
ALTER TABLE public.crm_clients 
ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'current',
ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low',
ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 50;

-- 3. Nuevos campos en crm_leads (Lead Machine)
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS nurture_stage TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS source_quality TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS response_time_hours INTEGER,
ADD COLUMN IF NOT EXISTS interaction_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_case_value NUMERIC(15, 2);

-- 4. Tabla de templates de comunicación
CREATE TABLE IF NOT EXISTS public.crm_communication_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tabla de ejecuciones de workflows
CREATE TABLE IF NOT EXISTS public.crm_workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL,
  lawyer_id UUID NOT NULL,
  trigger_event TEXT NOT NULL,
  trigger_data JSONB,
  actions_executed JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 6. Tabla de métricas diarias del CRM
CREATE TABLE IF NOT EXISTS public.crm_daily_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL,
  metric_date DATE NOT NULL,
  pipeline_value NUMERIC(15, 2) DEFAULT 0,
  leads_count INTEGER DEFAULT 0,
  leads_new INTEGER DEFAULT 0,
  leads_converted INTEGER DEFAULT 0,
  clients_active INTEGER DEFAULT 0,
  clients_at_risk INTEGER DEFAULT 0,
  cases_active INTEGER DEFAULT 0,
  cases_won INTEGER DEFAULT 0,
  cases_lost INTEGER DEFAULT 0,
  tasks_pending INTEGER DEFAULT 0,
  tasks_overdue INTEGER DEFAULT 0,
  revenue_collected NUMERIC(15, 2) DEFAULT 0,
  revenue_pending NUMERIC(15, 2) DEFAULT 0,
  avg_client_health NUMERIC(5, 2) DEFAULT 0,
  avg_case_health NUMERIC(5, 2) DEFAULT 0,
  win_rate NUMERIC(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lawyer_id, metric_date)
);

-- 7. Tabla de rentabilidad por caso
CREATE TABLE IF NOT EXISTS public.crm_case_profitability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL,
  lawyer_id UUID NOT NULL,
  hours_billed NUMERIC(10, 2) DEFAULT 0,
  hourly_rate NUMERIC(12, 2) DEFAULT 0,
  fixed_fee NUMERIC(15, 2) DEFAULT 0,
  expenses NUMERIC(15, 2) DEFAULT 0,
  revenue_collected NUMERIC(15, 2) DEFAULT 0,
  revenue_pending NUMERIC(15, 2) DEFAULT 0,
  profit_margin NUMERIC(5, 2) DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Tabla de historial de interacciones con leads
CREATE TABLE IF NOT EXISTS public.crm_lead_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  lawyer_id UUID NOT NULL,
  interaction_type TEXT NOT NULL,
  channel TEXT,
  notes TEXT,
  outcome TEXT,
  next_action TEXT,
  next_action_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Índices para optimización
CREATE INDEX IF NOT EXISTS idx_crm_cases_pipeline_stage ON public.crm_cases(lawyer_id, pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_crm_cases_health_score ON public.crm_cases(lawyer_id, health_score);
CREATE INDEX IF NOT EXISTS idx_crm_clients_health_score ON public.crm_clients(lawyer_id, health_score);
CREATE INDEX IF NOT EXISTS idx_crm_clients_risk_level ON public.crm_clients(lawyer_id, risk_level);
CREATE INDEX IF NOT EXISTS idx_crm_leads_score ON public.crm_leads(lawyer_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_nurture_stage ON public.crm_leads(lawyer_id, nurture_stage);
CREATE INDEX IF NOT EXISTS idx_crm_daily_metrics_date ON public.crm_daily_metrics(lawyer_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_executions_status ON public.crm_workflow_executions(lawyer_id, status);

-- 10. RLS para nuevas tablas
ALTER TABLE public.crm_communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_case_profitability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_interactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS usando lawyer_id = auth.uid() como las tablas existentes
CREATE POLICY "Lawyers can manage own templates" ON public.crm_communication_templates
  FOR ALL USING (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can view own workflow executions" ON public.crm_workflow_executions
  FOR SELECT USING (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can manage own metrics" ON public.crm_daily_metrics
  FOR ALL USING (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can manage own case profitability" ON public.crm_case_profitability
  FOR ALL USING (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can manage own lead interactions" ON public.crm_lead_interactions
  FOR ALL USING (lawyer_id = auth.uid());

-- 11. Publicación realtime para nuevas tablas
ALTER PUBLICATION supabase_realtime ADD TABLE crm_daily_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE crm_lead_interactions;