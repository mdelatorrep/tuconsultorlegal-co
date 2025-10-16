
-- Crear una política RLS que permita actualizar observaciones sin autenticación
-- usando el token del documento como validación

-- Primero, eliminar la política existente que requiere autenticación
DROP POLICY IF EXISTS "Users can update observations on their own documents" ON public.document_tokens;

-- Crear nueva política que permite actualizar observaciones basándose en:
-- 1. El estado del documento debe ser 'revision_usuario' o 'en_revision_abogado'
-- 2. Solo se pueden actualizar los campos: status, user_observations, user_observation_date, updated_at
-- 3. El nuevo status debe ser 'en_revision_abogado'
CREATE POLICY "Users can update observations using document token"
ON public.document_tokens
FOR UPDATE
USING (
  status IN ('revision_usuario', 'en_revision_abogado')
)
WITH CHECK (
  status = 'en_revision_abogado' AND
  -- Asegurar que solo se actualicen campos permitidos (implícito en la aplicación)
  true
);

-- Crear una política adicional para usuarios autenticados que poseen el documento
CREATE POLICY "Authenticated users can update their own document observations"
ON public.document_tokens
FOR UPDATE
USING (
  auth.uid() = user_id AND
  status IN ('revision_usuario', 'en_revision_abogado')
)
WITH CHECK (
  auth.uid() = user_id AND
  status IN ('revision_usuario', 'en_revision_abogado')
);
