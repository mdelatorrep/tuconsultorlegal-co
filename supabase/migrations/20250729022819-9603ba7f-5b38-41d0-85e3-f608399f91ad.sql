-- Paso 1: Agregar campos faltantes a lawyer_profiles
ALTER TABLE public.lawyer_profiles 
ADD COLUMN IF NOT EXISTS access_token text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS created_by uuid,
ADD COLUMN IF NOT EXISTS request_id uuid,
ADD COLUMN IF NOT EXISTS last_used_at timestamp with time zone;

-- Paso 2: Migrar datos de lawyer_tokens a lawyer_profiles
INSERT INTO public.lawyer_profiles (
  id, full_name, email, phone_number, access_token, 
  can_create_agents, can_create_blogs, can_use_ai_tools,
  last_login_at, active, created_by, request_id, last_used_at,
  created_at, updated_at, is_active
)
SELECT 
  lawyer_id, full_name, email, phone_number, access_token,
  can_create_agents, can_create_blogs, can_use_ai_tools,
  last_login_at, active, created_by, request_id, 
  COALESCE(last_login_at, created_at) as last_used_at,
  created_at, updated_at, active
FROM public.lawyer_tokens
ON CONFLICT (id) DO UPDATE SET
  access_token = EXCLUDED.access_token,
  phone_number = EXCLUDED.phone_number,
  last_login_at = EXCLUDED.last_login_at,
  active = EXCLUDED.active,
  created_by = EXCLUDED.created_by,
  request_id = EXCLUDED.request_id,
  last_used_at = EXCLUDED.last_used_at;

-- Paso 3: Actualizar foreign keys que apuntan a lawyer_tokens
-- Actualizar lawyer_certificates para apuntar a lawyer_profiles
UPDATE public.lawyer_certificates 
SET lawyer_id = lt.lawyer_id
FROM public.lawyer_tokens lt
WHERE public.lawyer_certificates.lawyer_id = lt.id;

-- Actualizar lawyer_training_progress para apuntar a lawyer_profiles  
UPDATE public.lawyer_training_progress
SET lawyer_id = lt.lawyer_id
FROM public.lawyer_tokens lt
WHERE public.lawyer_training_progress.lawyer_id = lt.id;

-- Paso 4: Eliminar la tabla lawyer_tokens
DROP TABLE IF EXISTS public.lawyer_tokens CASCADE;