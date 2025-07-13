-- Crear tabla de configuración global del sistema
CREATE TABLE public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insertar configuración por defecto para ANS máximo
INSERT INTO public.system_config (config_key, config_value, description)
VALUES 
  ('max_sla_hours', '24', 'Número máximo de horas permitidas para ANS de documentos'),
  ('default_sla_hours', '4', 'ANS por defecto en horas para nuevos agentes');

-- Agregar campos de ANS a la tabla legal_agents
ALTER TABLE public.legal_agents 
ADD COLUMN sla_hours INTEGER DEFAULT 4,
ADD COLUMN sla_enabled BOOLEAN DEFAULT true;

-- Agregar campos de ANS a la tabla document_tokens
ALTER TABLE public.document_tokens 
ADD COLUMN sla_hours INTEGER,
ADD COLUMN sla_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN sla_status TEXT DEFAULT 'on_time' CHECK (sla_status IN ('on_time', 'at_risk', 'overdue', 'completed_on_time', 'completed_late'));

-- Habilitar RLS en system_config
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Policy para que solo service role pueda acceder a la configuración
CREATE POLICY "Service role can manage system config" 
ON public.system_config 
FOR ALL 
USING (true);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_document_tokens_sla_status ON public.document_tokens(sla_status);
CREATE INDEX idx_document_tokens_sla_deadline ON public.document_tokens(sla_deadline);
CREATE INDEX idx_legal_agents_sla_enabled ON public.legal_agents(sla_enabled);

-- Crear función para actualizar automáticamente el estado del ANS
CREATE OR REPLACE FUNCTION public.update_sla_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular deadline basado en created_at + sla_hours
  IF NEW.sla_hours IS NOT NULL AND NEW.sla_deadline IS NULL THEN
    NEW.sla_deadline = NEW.created_at + (NEW.sla_hours || ' hours')::INTERVAL;
  END IF;
  
  -- Actualizar estado del ANS basado en el tiempo actual
  IF NEW.status IN ('pagado', 'descargado') THEN
    -- Documento completado
    IF NEW.updated_at <= NEW.sla_deadline THEN
      NEW.sla_status = 'completed_on_time';
    ELSE
      NEW.sla_status = 'completed_late';
    END IF;
  ELSE
    -- Documento en proceso
    IF now() > NEW.sla_deadline THEN
      NEW.sla_status = 'overdue';
    ELSIF now() > NEW.sla_deadline - INTERVAL '2 hours' THEN
      NEW.sla_status = 'at_risk';
    ELSE
      NEW.sla_status = 'on_time';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar ANS automáticamente
CREATE TRIGGER update_document_sla_trigger
  BEFORE INSERT OR UPDATE ON public.document_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sla_status();

-- Crear trigger para updated_at en system_config
CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();