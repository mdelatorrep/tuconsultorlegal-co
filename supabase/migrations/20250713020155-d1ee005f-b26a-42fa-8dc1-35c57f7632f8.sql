-- Crear políticas RLS para permitir operaciones de borradores a través de edge functions
DROP POLICY IF EXISTS "Service role can manage agent drafts" ON agent_drafts;

-- Política para permitir todas las operaciones a través de service role (edge functions)
CREATE POLICY "Allow service role access to agent drafts" ON agent_drafts
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Política para permitir que los abogados vean y gestionen sus propios borradores 
-- (cuando implementemos autenticación directa de abogados)
CREATE POLICY "Lawyers can manage their own drafts" ON agent_drafts
  FOR ALL 
  USING (lawyer_id IN (
    SELECT id FROM lawyer_tokens 
    WHERE access_token = current_setting('request.headers')::json->>'authorization'
  ))
  WITH CHECK (lawyer_id IN (
    SELECT id FROM lawyer_tokens 
    WHERE access_token = current_setting('request.headers')::json->>'authorization'
  ));