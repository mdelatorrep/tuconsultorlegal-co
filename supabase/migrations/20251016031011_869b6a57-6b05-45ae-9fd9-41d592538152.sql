-- Agregar política RLS para permitir actualizar documentos gratuitos a estado 'pagado'
-- Los documentos gratuitos (price = 0) pueden ser marcados como pagados por cualquier usuario
-- que tenga acceso al código de seguimiento

CREATE POLICY "Anyone can mark free documents as paid"
ON public.document_tokens
FOR UPDATE
USING (
  price = 0 
  AND status = 'revision_usuario'
)
WITH CHECK (
  price = 0 
  AND status = 'pagado'
);
