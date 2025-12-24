-- Agregar columnas case_id y client_id a legal_tools_results para vincular herramientas IA con casos del CRM
ALTER TABLE legal_tools_results 
  ADD COLUMN case_id uuid REFERENCES crm_cases(id) ON DELETE SET NULL,
  ADD COLUMN client_id uuid REFERENCES crm_clients(id) ON DELETE SET NULL;

-- Crear índices para búsquedas eficientes
CREATE INDEX idx_legal_tools_case ON legal_tools_results(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX idx_legal_tools_client ON legal_tools_results(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_legal_tools_lawyer_case ON legal_tools_results(lawyer_id, case_id) WHERE case_id IS NOT NULL;

-- Comentarios descriptivos
COMMENT ON COLUMN legal_tools_results.case_id IS 'ID del caso del CRM vinculado a este resultado de herramienta IA';
COMMENT ON COLUMN legal_tools_results.client_id IS 'ID del cliente del CRM vinculado a este resultado de herramienta IA';