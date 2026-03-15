
UPDATE legal_content 
SET content = REPLACE(content, 'Tu Consultor Legal S.A.S.', 'PRAXIS SERVICES CO S.A.S.')
WHERE content LIKE '%Tu Consultor Legal S.A.S.%';

UPDATE legal_content 
SET content = REPLACE(content, 'Tu Consultor Legal', 'Praxis Hub')
WHERE content LIKE '%Tu Consultor Legal%';

UPDATE legal_content 
SET content = REPLACE(content, 'contacto@tuconsultorlegal.co', 'contacto@praxis-hub.co')
WHERE content LIKE '%contacto@tuconsultorlegal.co%';
