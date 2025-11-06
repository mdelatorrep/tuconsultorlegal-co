-- =====================================================
-- TABLA DE AUDITORÍA DE ACEPTACIÓN DE TÉRMINOS
-- Para cumplimiento regulatorio y soporte legal
-- =====================================================

-- Crear tabla de auditoría de términos
CREATE TABLE IF NOT EXISTS public.terms_acceptance_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información del usuario
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('user', 'lawyer', 'anonymous')),
  user_email TEXT NOT NULL,
  user_name TEXT,
  
  -- Tipo de aceptación
  acceptance_type TEXT NOT NULL CHECK (acceptance_type IN ('registration', 'document_creation', 'subscription', 'profile_update')),
  acceptance_context TEXT, -- Información adicional del contexto
  
  -- Versiones de documentos legales
  terms_version TEXT NOT NULL DEFAULT '1.0',
  privacy_policy_version TEXT NOT NULL DEFAULT '1.0',
  
  -- Consentimientos específicos
  data_processing_consent BOOLEAN NOT NULL DEFAULT false,
  intellectual_property_consent BOOLEAN,
  marketing_consent BOOLEAN DEFAULT false,
  
  -- Información técnica de auditoría
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}',
  
  -- Metadata adicional
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_terms_audit_user_id ON public.terms_acceptance_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_terms_audit_user_email ON public.terms_acceptance_audit(user_email);
CREATE INDEX IF NOT EXISTS idx_terms_audit_type ON public.terms_acceptance_audit(acceptance_type);
CREATE INDEX IF NOT EXISTS idx_terms_audit_date ON public.terms_acceptance_audit(accepted_at DESC);
CREATE INDEX IF NOT EXISTS idx_terms_audit_user_type ON public.terms_acceptance_audit(user_type);

-- RLS Policies
ALTER TABLE public.terms_acceptance_audit ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver registros de auditoría
CREATE POLICY "Admins can view all terms audit logs"
  ON public.terms_acceptance_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
      AND admin_profiles.active = true
    )
  );

-- Service role puede hacer todo
CREATE POLICY "Service role can manage terms audit"
  ON public.terms_acceptance_audit
  FOR ALL
  USING (auth.role() = 'service_role');

-- Los usuarios pueden ver sus propios registros
CREATE POLICY "Users can view their own terms audit"
  ON public.terms_acceptance_audit
  FOR SELECT
  USING (auth.uid() = user_id);

-- Comentarios para documentación
COMMENT ON TABLE public.terms_acceptance_audit IS 'Auditoría de aceptación de términos y condiciones para cumplimiento regulatorio';
COMMENT ON COLUMN public.terms_acceptance_audit.acceptance_type IS 'Tipo de aceptación: registration, document_creation, subscription, profile_update';
COMMENT ON COLUMN public.terms_acceptance_audit.ip_address IS 'Dirección IP del usuario al momento de aceptar';
COMMENT ON COLUMN public.terms_acceptance_audit.user_agent IS 'User agent del navegador';
COMMENT ON COLUMN public.terms_acceptance_audit.metadata IS 'Información adicional en formato JSON';