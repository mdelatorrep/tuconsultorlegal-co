-- =============================================
-- CREDIT SYSTEM FOR LAWYERS
-- =============================================

-- 1. Lawyer Credits Balance
CREATE TABLE public.lawyer_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL UNIQUE REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  current_balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Credit Packages (purchasable)
CREATE TABLE public.credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  credits INTEGER NOT NULL,
  bonus_credits INTEGER NOT NULL DEFAULT 0,
  price_cop DECIMAL(12,2) NOT NULL,
  discount_percentage INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Credit Tool Costs (configurable by admin)
CREATE TABLE public.credit_tool_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_type TEXT NOT NULL UNIQUE,
  tool_name TEXT NOT NULL,
  credit_cost INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  icon TEXT DEFAULT 'Brain',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Credit Transactions (history)
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'bonus', 'referral', 'gamification', 'admin_grant', 'welcome')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Lawyer Referrals
CREATE TABLE public.lawyer_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES public.lawyer_profiles(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'credited')),
  credits_awarded_referrer INTEGER NOT NULL DEFAULT 0,
  credits_awarded_referred INTEGER NOT NULL DEFAULT 0,
  referred_email TEXT,
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Gamification Tasks
CREATE TABLE public.gamification_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  credit_reward INTEGER NOT NULL DEFAULT 1,
  task_type TEXT NOT NULL CHECK (task_type IN ('onetime', 'daily', 'weekly', 'achievement')),
  completion_criteria JSONB DEFAULT '{}',
  max_completions INTEGER DEFAULT 1,
  icon TEXT DEFAULT 'Star',
  badge_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Gamification Progress
CREATE TABLE public.gamification_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.gamification_tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'claimed')),
  completion_count INTEGER NOT NULL DEFAULT 0,
  progress_data JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  UNIQUE(lawyer_id, task_id)
);

-- =============================================
-- ENABLE RLS
-- =============================================

ALTER TABLE public.lawyer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_tool_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyer_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_progress ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- lawyer_credits policies
CREATE POLICY "Lawyers can view their own credits"
  ON public.lawyer_credits FOR SELECT
  USING (auth.uid() = lawyer_id);

CREATE POLICY "Service role can manage credits"
  ON public.lawyer_credits FOR ALL
  USING (auth.role() = 'service_role');

-- credit_packages policies
CREATE POLICY "Anyone can view active packages"
  ON public.credit_packages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage packages"
  ON public.credit_packages FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can manage packages"
  ON public.credit_packages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE admin_profiles.user_id = auth.uid() AND admin_profiles.active = true
  ));

-- credit_tool_costs policies
CREATE POLICY "Anyone can view active tool costs"
  ON public.credit_tool_costs FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage tool costs"
  ON public.credit_tool_costs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can manage tool costs"
  ON public.credit_tool_costs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE admin_profiles.user_id = auth.uid() AND admin_profiles.active = true
  ));

-- credit_transactions policies
CREATE POLICY "Lawyers can view their own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = lawyer_id);

CREATE POLICY "Service role can manage transactions"
  ON public.credit_transactions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view all transactions"
  ON public.credit_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE admin_profiles.user_id = auth.uid() AND admin_profiles.active = true
  ));

-- lawyer_referrals policies
CREATE POLICY "Lawyers can view their own referrals"
  ON public.lawyer_referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Service role can manage referrals"
  ON public.lawyer_referrals FOR ALL
  USING (auth.role() = 'service_role');

-- gamification_tasks policies
CREATE POLICY "Anyone can view active tasks"
  ON public.gamification_tasks FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage tasks"
  ON public.gamification_tasks FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can manage tasks"
  ON public.gamification_tasks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE admin_profiles.user_id = auth.uid() AND admin_profiles.active = true
  ));

-- gamification_progress policies
CREATE POLICY "Lawyers can view their own progress"
  ON public.gamification_progress FOR SELECT
  USING (auth.uid() = lawyer_id);

CREATE POLICY "Service role can manage progress"
  ON public.gamification_progress FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_lawyer_credits_lawyer_id ON public.lawyer_credits(lawyer_id);
CREATE INDEX idx_credit_transactions_lawyer_id ON public.credit_transactions(lawyer_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX idx_lawyer_referrals_referrer_id ON public.lawyer_referrals(referrer_id);
CREATE INDEX idx_lawyer_referrals_code ON public.lawyer_referrals(referral_code);
CREATE INDEX idx_gamification_progress_lawyer_id ON public.gamification_progress(lawyer_id);

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER update_lawyer_credits_updated_at
  BEFORE UPDATE ON public.lawyer_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_packages_updated_at
  BEFORE UPDATE ON public.credit_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_tool_costs_updated_at
  BEFORE UPDATE ON public.credit_tool_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gamification_tasks_updated_at
  BEFORE UPDATE ON public.gamification_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INITIAL DATA: Credit Packages
-- =============================================

INSERT INTO public.credit_packages (name, description, credits, bonus_credits, price_cop, discount_percentage, is_featured, display_order) VALUES
('Starter', 'Ideal para empezar a explorar las herramientas de IA', 50, 0, 25000, 0, false, 1),
('Profesional', 'El más popular - perfecto para uso regular', 150, 25, 60000, 15, true, 2),
('Experto', 'Para uso intensivo y proyectos grandes', 350, 75, 120000, 20, false, 3),
('Firma Legal', 'Para equipos y firmas con alto volumen', 1000, 250, 300000, 25, false, 4);

-- =============================================
-- INITIAL DATA: Tool Costs
-- =============================================

INSERT INTO public.credit_tool_costs (tool_type, tool_name, credit_cost, description, icon) VALUES
('legal_research', 'Investigación Legal IA', 5, 'Búsqueda avanzada en fuentes legales colombianas', 'Search'),
('suin_juriscol', 'SUIN-Juriscol', 3, 'Consulta normativa colombiana oficial', 'BookOpen'),
('judicial_process', 'Consulta Procesos Judiciales', 10, 'Consulta real de procesos en la rama judicial', 'Gavel'),
('document_analysis', 'Análisis de Documentos', 8, 'Análisis detallado de documentos legales con IA', 'FileSearch'),
('document_drafting', 'Redacción Legal', 15, 'Generación de documentos legales con IA', 'PenTool'),
('strategy_analysis', 'Estrategia Legal', 12, 'Análisis estratégico de casos y situaciones', 'Target'),
('crm_ai', 'CRM con IA', 5, 'Segmentación y análisis inteligente de clientes', 'Users'),
('spell_check', 'Corrector Ortográfico', 1, 'Revisión de ortografía y gramática legal', 'SpellCheck');

-- =============================================
-- INITIAL DATA: Gamification Tasks
-- =============================================

INSERT INTO public.gamification_tasks (task_key, name, description, credit_reward, task_type, icon, badge_name, display_order) VALUES
-- Onboarding tasks (one-time)
('complete_profile', 'Completa tu Perfil', 'Agrega foto, bio y especialidades a tu perfil público', 10, 'onetime', 'User', 'Perfil Completo', 1),
('first_research', 'Primera Investigación', 'Realiza tu primera búsqueda legal con IA', 5, 'onetime', 'Search', 'Investigador', 2),
('first_document', 'Primer Documento', 'Crea tu primer documento con asistencia de IA', 10, 'onetime', 'FileText', 'Redactor', 3),
('first_referral', 'Primer Referido', 'Invita a tu primer colega a la plataforma', 20, 'onetime', 'UserPlus', 'Embajador', 4),
('complete_training', 'Certificación IA Legal', 'Completa el curso de capacitación en IA Legal', 50, 'onetime', 'Award', 'Certificado', 5),
('first_purchase', 'Primera Compra', 'Realiza tu primera compra de créditos', 10, 'onetime', 'CreditCard', 'Inversor', 6),

-- Daily tasks
('daily_login', 'Inicio de Sesión Diario', 'Inicia sesión en la plataforma cada día', 1, 'daily', 'LogIn', NULL, 10),
('daily_tool_use', 'Uso Diario de Herramientas', 'Usa al menos una herramienta de IA hoy', 2, 'daily', 'Zap', NULL, 11),

-- Weekly tasks
('weekly_5_tools', 'Semana Productiva', 'Usa 5 herramientas diferentes esta semana', 10, 'weekly', 'TrendingUp', 'Productivo', 20),
('weekly_blog', 'Escritor Semanal', 'Publica un artículo en el blog esta semana', 15, 'weekly', 'Newspaper', 'Autor', 21),

-- Achievements
('achieve_10_researches', '10 Investigaciones', 'Completa 10 investigaciones legales', 25, 'achievement', 'Search', 'Investigador Experto', 30),
('achieve_50_documents', '50 Documentos', 'Crea 50 documentos con IA', 100, 'achievement', 'FileStack', 'Maestro Redactor', 31),
('achieve_5_referrals', '5 Referidos Activos', 'Invita a 5 colegas que se registren y usen la plataforma', 100, 'achievement', 'Users', 'Super Embajador', 32),
('achieve_first_month', 'Primer Mes Activo', 'Mantén actividad durante tu primer mes', 30, 'achievement', 'Calendar', 'Veterano', 33);

-- =============================================
-- FUNCTION: Initialize lawyer credits on profile creation
-- =============================================

CREATE OR REPLACE FUNCTION public.initialize_lawyer_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Create credits record with welcome bonus
  INSERT INTO public.lawyer_credits (lawyer_id, current_balance, total_earned)
  VALUES (NEW.id, 10, 10)
  ON CONFLICT (lawyer_id) DO NOTHING;
  
  -- Record welcome bonus transaction
  INSERT INTO public.credit_transactions (lawyer_id, transaction_type, amount, balance_after, description)
  VALUES (NEW.id, 'welcome', 10, 10, 'Créditos de bienvenida');
  
  -- Generate unique referral code
  INSERT INTO public.lawyer_referrals (referrer_id, referral_code)
  VALUES (NEW.id, 'REF-' || upper(substr(md5(random()::text), 1, 8)))
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_lawyer_profile_created_init_credits
  AFTER INSERT ON public.lawyer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_lawyer_credits();