-- Corregir el precio del agente Carta de Renuncia Laboral a 2,000,000 COP
UPDATE legal_agents 
SET price = 2000000,
    updated_at = now()
WHERE id = 'c11e3da6-ed4c-456e-8a52-c6cccb6c0487';