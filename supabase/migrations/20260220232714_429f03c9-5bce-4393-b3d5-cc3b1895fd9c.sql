
-- Add alert configuration columns to monitored_processes
ALTER TABLE public.monitored_processes
  ADD COLUMN IF NOT EXISTS alerta_email boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS alerta_app boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS alerta_nuevas_actuaciones boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS alerta_cambio_estado boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS alerta_audiencias boolean DEFAULT true;
