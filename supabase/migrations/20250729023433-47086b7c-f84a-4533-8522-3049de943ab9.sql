-- Eliminar columnas relacionadas con tokens que ya no se necesitan
ALTER TABLE public.lawyer_profiles 
DROP COLUMN IF EXISTS access_token,
DROP COLUMN IF EXISTS last_used_at,
DROP COLUMN IF EXISTS created_by,
DROP COLUMN IF EXISTS request_id;

-- Eliminar tabla de solicitudes de tokens ya que no se necesita
DROP TABLE IF EXISTS public.lawyer_token_requests CASCADE;