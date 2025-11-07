-- Corregir precios de documentos que tienen legal_agent_id NULL
-- y actualizar con el precio correcto del agente basado en document_type

-- Crear una función temporal para actualizar precios
DO $$
DECLARE
  doc RECORD;
  agent_price INTEGER;
BEGIN
  -- Iterar sobre documentos sin legal_agent_id que tienen precio incorrecto
  FOR doc IN 
    SELECT dt.id, dt.document_type, dt.price, dt.token
    FROM document_tokens dt
    WHERE dt.legal_agent_id IS NULL
    AND dt.price > 0  -- Solo documentos con precio mayor a 0
  LOOP
    -- Intentar encontrar el agente correspondiente por nombre
    SELECT la.price INTO agent_price
    FROM legal_agents la
    WHERE LOWER(TRIM(la.name)) = LOWER(TRIM(doc.document_type))
    AND la.status IN ('active', 'approved')
    LIMIT 1;
    
    -- Si se encontró el agente, actualizar el precio
    IF FOUND THEN
      UPDATE document_tokens
      SET price = agent_price,
          updated_at = NOW()
      WHERE id = doc.id;
      
      RAISE NOTICE 'Updated document % (token: %) from price % to % based on agent', 
        doc.id, doc.token, doc.price, agent_price;
    ELSE
      -- Si no se encontró agente, establecer precio en 0
      UPDATE document_tokens
      SET price = 0,
          updated_at = NOW()
      WHERE id = doc.id;
      
      RAISE NOTICE 'Updated document % (token: %) to price 0 (no matching agent found)', 
        doc.id, doc.token;
    END IF;
  END LOOP;
END $$;

-- Comentario explicativo
COMMENT ON TABLE document_tokens IS 
'Stores generated document tokens. Price should always come from the associated legal_agent.
Documents without legal_agent_id should have price = 0 unless explicitly set.';
