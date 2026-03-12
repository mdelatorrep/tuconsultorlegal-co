ALTER TABLE public.crm_cases 
  ADD COLUMN IF NOT EXISTS juzgado text,
  ADD COLUMN IF NOT EXISTS clase_proceso text,
  ADD COLUMN IF NOT EXISTS demandante text,
  ADD COLUMN IF NOT EXISTS demandado text,
  ADD COLUMN IF NOT EXISTS asignado_a text,
  ADD COLUMN IF NOT EXISTS nota_pendiente text,
  ADD COLUMN IF NOT EXISTS enlace_hoja_ruta text,
  ADD COLUMN IF NOT EXISTS enlace_expediente text;