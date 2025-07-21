-- Agregar columna para permisos de blog a lawyer_tokens
ALTER TABLE public.lawyer_tokens 
ADD COLUMN can_create_blogs boolean NOT NULL DEFAULT false;

-- Agregar comentario para documentar la funcionalidad
COMMENT ON COLUMN public.lawyer_tokens.can_create_blogs IS 'Determina si el abogado puede crear artículos de blog';

-- Actualizar algunos abogados de ejemplo para que puedan crear blogs (opcional)
UPDATE public.lawyer_tokens 
SET can_create_blogs = true 
WHERE email IN (
    SELECT email FROM public.lawyer_tokens 
    WHERE can_create_agents = true 
    LIMIT 2
);