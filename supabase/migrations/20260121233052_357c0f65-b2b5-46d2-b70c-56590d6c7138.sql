-- Delete duplicate agents keeping only the active one (8e5843ee-3fd0-49b2-af77-569af9ed7e74)
DELETE FROM legal_agents 
WHERE name = 'CONTRATO DE TRABAJO A TERMINO INDEFINIDO - EMPLEADOR PERSONA NATURAL'
  AND id != '8e5843ee-3fd0-49b2-af77-569af9ed7e74';

-- Also clean up any orphaned conversation_blocks and field_instructions
DELETE FROM conversation_blocks 
WHERE legal_agent_id NOT IN (SELECT id FROM legal_agents);

DELETE FROM field_instructions 
WHERE legal_agent_id NOT IN (SELECT id FROM legal_agents);