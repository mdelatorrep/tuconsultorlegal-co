-- Separar claramente administradores y abogados
-- Los administradores NO son abogados y los abogados NO pueden ser administradores

-- 1. Eliminar campos de admin de la tabla lawyer_accounts
ALTER TABLE public.lawyer_accounts 
DROP COLUMN IF EXISTS is_admin;

-- 2. Asegurar que solo hay una tabla para administradores
-- La tabla admin_accounts ya existe y es correcta

-- 3. Eliminar cualquier confusión en las políticas RLS
DROP POLICY IF EXISTS "Admin access to lawyer accounts" ON public.lawyer_accounts;

-- 4. Crear políticas RLS claras para lawyer_accounts
CREATE POLICY "Lawyers can view their own account only" 
ON public.lawyer_accounts 
FOR SELECT 
USING (auth.uid()::text = id::text);

CREATE POLICY "Lawyers can update their own account only" 
ON public.lawyer_accounts 
FOR UPDATE 
USING (auth.uid()::text = id::text);

-- 5. Solo administradores pueden gestionar abogados (via edge functions)
-- Las edge functions usan SERVICE_ROLE_KEY para bypasear RLS

-- 6. Actualizar campos de lawyer_accounts para ser más claros
COMMENT ON TABLE public.lawyer_accounts IS 'Tabla para abogados que usan la plataforma - NO son administradores';
COMMENT ON TABLE public.admin_accounts IS 'Tabla para administradores del sistema - NO son abogados';