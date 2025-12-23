-- =============================================
-- FASE 2.1: MONITOR RAMA JUDICIAL
-- =============================================

-- Tabla de procesos monitoreados
CREATE TABLE IF NOT EXISTS public.monitored_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  radicado VARCHAR(50) NOT NULL,
  despacho TEXT,
  demandante TEXT,
  demandado TEXT,
  tipo_proceso TEXT,
  estado TEXT DEFAULT 'activo',
  ultima_actuacion_fecha TIMESTAMPTZ,
  ultima_actuacion_descripcion TEXT,
  notificaciones_activas BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lawyer_id, radicado)
);

-- Historial de actuaciones
CREATE TABLE IF NOT EXISTS public.process_actuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitored_process_id UUID NOT NULL REFERENCES public.monitored_processes(id) ON DELETE CASCADE,
  fecha_actuacion TIMESTAMPTZ NOT NULL,
  anotacion TEXT NOT NULL,
  actuacion TEXT,
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,
  is_new BOOLEAN DEFAULT true,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- FASE 2.2: SMART LEGAL CALENDAR
-- =============================================

-- Eventos del calendario legal
CREATE TABLE IF NOT EXISTS public.legal_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.crm_cases(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.crm_clients(id) ON DELETE SET NULL,
  monitored_process_id UUID REFERENCES public.monitored_processes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type VARCHAR(50) NOT NULL, -- 'audiencia', 'termino', 'vencimiento', 'cita', 'recordatorio'
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  is_auto_generated BOOLEAN DEFAULT false,
  source_document_id UUID,
  alert_before_minutes INTEGER[] DEFAULT ARRAY[1440, 60], -- 24h and 1h before
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  color VARCHAR(20),
  recurrence_rule TEXT, -- iCal RRULE format
  external_calendar_id TEXT, -- Google Calendar sync
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Días festivos Colombia
CREATE TABLE IF NOT EXISTS public.colombian_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'festivo', -- 'festivo', 'no_laboral'
  year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM fecha)::INTEGER) STORED
);

-- Insertar festivos Colombia 2024-2025
INSERT INTO public.colombian_holidays (fecha, nombre) VALUES
-- 2024
('2024-01-01', 'Año Nuevo'),
('2024-01-08', 'Día de los Reyes Magos'),
('2024-03-25', 'San José'),
('2024-03-28', 'Jueves Santo'),
('2024-03-29', 'Viernes Santo'),
('2024-05-01', 'Día del Trabajo'),
('2024-05-13', 'Ascensión del Señor'),
('2024-06-03', 'Corpus Christi'),
('2024-06-10', 'Sagrado Corazón'),
('2024-07-01', 'San Pedro y San Pablo'),
('2024-07-20', 'Día de la Independencia'),
('2024-08-07', 'Batalla de Boyacá'),
('2024-08-19', 'Asunción de la Virgen'),
('2024-10-14', 'Día de la Raza'),
('2024-11-04', 'Todos los Santos'),
('2024-11-11', 'Independencia de Cartagena'),
('2024-12-08', 'Inmaculada Concepción'),
('2024-12-25', 'Navidad'),
-- 2025
('2025-01-01', 'Año Nuevo'),
('2025-01-06', 'Día de los Reyes Magos'),
('2025-03-24', 'San José'),
('2025-04-17', 'Jueves Santo'),
('2025-04-18', 'Viernes Santo'),
('2025-05-01', 'Día del Trabajo'),
('2025-06-02', 'Ascensión del Señor'),
('2025-06-23', 'Corpus Christi'),
('2025-06-30', 'Sagrado Corazón'),
('2025-07-04', 'San Pedro y San Pablo'),
('2025-07-20', 'Día de la Independencia'),
('2025-08-07', 'Batalla de Boyacá'),
('2025-08-18', 'Asunción de la Virgen'),
('2025-10-13', 'Día de la Raza'),
('2025-11-03', 'Todos los Santos'),
('2025-11-17', 'Independencia de Cartagena'),
('2025-12-08', 'Inmaculada Concepción'),
('2025-12-25', 'Navidad')
ON CONFLICT (fecha) DO NOTHING;

-- =============================================
-- FASE 4.1: CASE PREDICTOR
-- =============================================

CREATE TABLE IF NOT EXISTS public.case_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.crm_cases(id) ON DELETE SET NULL,
  case_type TEXT NOT NULL,
  case_description TEXT NOT NULL,
  jurisdiction TEXT,
  court_type TEXT,
  prediction_result JSONB, -- {success_probability, estimated_duration, key_factors, similar_cases}
  ai_analysis TEXT,
  recommended_arguments JSONB,
  risk_factors JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- FASE 4.2: CLIENT PORTAL
-- =============================================

-- Acceso de clientes al portal
CREATE TABLE IF NOT EXISTS public.client_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.crm_clients(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  access_token VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_access_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Documentos compartidos con clientes
CREATE TABLE IF NOT EXISTS public.client_shared_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.crm_clients(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_url TEXT,
  document_type VARCHAR(50),
  file_size INTEGER,
  is_from_client BOOLEAN DEFAULT false,
  notes TEXT,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Citas/Appointments
CREATE TABLE IF NOT EXISTS public.client_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.crm_clients(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.crm_cases(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,
  meeting_url TEXT,
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'cancelled', 'completed'
  client_notes TEXT,
  lawyer_notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.monitored_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_actuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_shared_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_appointments ENABLE ROW LEVEL SECURITY;

-- Monitored Processes policies
CREATE POLICY "Lawyers can manage their monitored processes"
ON public.monitored_processes FOR ALL
USING (auth.uid() = lawyer_id);

-- Process Actuations policies
CREATE POLICY "Lawyers can view their process actuations"
ON public.process_actuations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.monitored_processes mp
    WHERE mp.id = monitored_process_id AND mp.lawyer_id = auth.uid()
  )
);

-- Calendar Events policies
CREATE POLICY "Lawyers can manage their calendar events"
ON public.legal_calendar_events FOR ALL
USING (auth.uid() = lawyer_id);

-- Case Predictions policies
CREATE POLICY "Lawyers can manage their case predictions"
ON public.case_predictions FOR ALL
USING (auth.uid() = lawyer_id);

-- Client Portal Access policies
CREATE POLICY "Lawyers can manage client portal access"
ON public.client_portal_access FOR ALL
USING (auth.uid() = lawyer_id);

-- Client Shared Documents policies
CREATE POLICY "Lawyers can manage shared documents"
ON public.client_shared_documents FOR ALL
USING (auth.uid() = lawyer_id);

-- Client Appointments policies
CREATE POLICY "Lawyers can manage appointments"
ON public.client_appointments FOR ALL
USING (auth.uid() = lawyer_id);

-- Colombian Holidays - public read
ALTER TABLE public.colombian_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read holidays"
ON public.colombian_holidays FOR SELECT
USING (true);

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER update_monitored_processes_updated_at
BEFORE UPDATE ON public.monitored_processes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.legal_calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.client_appointments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FUNCTION: Calculate Business Days (Colombia)
-- =============================================

CREATE OR REPLACE FUNCTION public.add_business_days(start_date DATE, num_days INTEGER)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_date DATE := start_date;
  days_added INTEGER := 0;
BEGIN
  WHILE days_added < num_days LOOP
    result_date := result_date + INTERVAL '1 day';
    -- Skip weekends
    IF EXTRACT(DOW FROM result_date) NOT IN (0, 6) THEN
      -- Skip holidays
      IF NOT EXISTS (SELECT 1 FROM colombian_holidays WHERE fecha = result_date) THEN
        days_added := days_added + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN result_date;
END;
$$;