-- Verificar y actualizar el constraint de status para legal_agents
-- Primero eliminamos el constraint existente si existe
ALTER TABLE legal_agents DROP CONSTRAINT IF EXISTS legal_agents_status_check;

-- Creamos el nuevo constraint que incluye todos los estados necesarios
ALTER TABLE legal_agents ADD CONSTRAINT legal_agents_status_check 
CHECK (status IN ('pending_review', 'approved', 'active', 'rejected', 'suspended'));