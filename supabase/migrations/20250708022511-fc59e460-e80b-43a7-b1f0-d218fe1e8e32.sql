-- Add frontend parameters and target audience to legal agents

ALTER TABLE public.legal_agents 
ADD COLUMN IF NOT EXISTS frontend_icon TEXT,
ADD COLUMN IF NOT EXISTS document_name TEXT,
ADD COLUMN IF NOT EXISTS document_description TEXT,
ADD COLUMN IF NOT EXISTS button_cta TEXT DEFAULT 'Generar Documento',
ADD COLUMN IF NOT EXISTS target_audience TEXT CHECK (target_audience IN ('personas', 'empresas', 'ambos')) DEFAULT 'personas';

-- Update existing agents with default values
UPDATE public.legal_agents 
SET 
  document_name = name,
  document_description = description,
  frontend_icon = 'FileText',
  button_cta = 'Generar Documento',
  target_audience = 'personas'
WHERE document_name IS NULL;