-- Unificar estados: cambiar todos los agentes 'approved' a 'active' y eliminar el estado 'approved'

-- Primero, actualizar todos los agentes con estado 'approved' a 'active'
UPDATE public.legal_agents 
SET status = 'active' 
WHERE status = 'approved';

-- Eliminar el constraint actual del estado
ALTER TABLE public.legal_agents 
DROP CONSTRAINT IF EXISTS legal_agents_status_check;

-- Crear nuevo constraint sin el estado 'approved'
ALTER TABLE public.legal_agents 
ADD CONSTRAINT legal_agents_status_check CHECK (status IN ('draft', 'pending_review', 'active', 'suspended'));