-- Migrar de suggested_price y final_price a un solo campo price
-- El precio será el final_price si existe, sino el suggested_price

-- Agregar la nueva columna price
ALTER TABLE public.legal_agents 
ADD COLUMN price integer DEFAULT 0;

-- Migrar los datos existentes
UPDATE public.legal_agents 
SET price = COALESCE(final_price, suggested_price, 0);

-- Hacer que price no pueda ser nulo
ALTER TABLE public.legal_agents 
ALTER COLUMN price SET NOT NULL;

-- Eliminar las columnas antiguas
ALTER TABLE public.legal_agents 
DROP COLUMN suggested_price,
DROP COLUMN final_price;