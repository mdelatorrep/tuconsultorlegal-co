-- **SOLUCIÓN DE RAÍZ: SISTEMA DE AUTENTICACIÓN UNIFICADO**

-- 1. Crear enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'lawyer', 'super_admin');

-- 2. Crear tabla de roles de usuario
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Habilitar RLS en user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Función de seguridad para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Función para obtener el role de un usuario autenticado
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY 
    CASE 
      WHEN role = 'super_admin' THEN 1
      WHEN role = 'admin' THEN 2
      WHEN role = 'lawyer' THEN 3
      ELSE 4
    END
  LIMIT 1
$$;

-- 5. REEMPLAZAR las políticas RLS problemáticas en legal_agents
DROP POLICY IF EXISTS "Public access to legal agents" ON public.legal_agents;

-- Política para lectura: cualquiera puede ver agentes activos
CREATE POLICY "Anyone can view active agents"
ON public.legal_agents
FOR SELECT
USING (status IN ('active', 'approved'));

-- Política para administradores: control total
CREATE POLICY "Admins can manage all agents"
ON public.legal_agents
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- Política para abogados: pueden ver y modificar sus propios agentes
CREATE POLICY "Lawyers can manage their own agents"
ON public.legal_agents
FOR ALL
TO authenticated
USING (
  created_by IN (
    SELECT id FROM public.lawyer_tokens 
    WHERE lawyer_id = auth.uid() 
    AND active = true
  )
)
WITH CHECK (
  created_by IN (
    SELECT id FROM public.lawyer_tokens 
    WHERE lawyer_id = auth.uid() 
    AND active = true
  )
);

-- 6. Asignar rol de admin al usuario actual
INSERT INTO public.user_roles (user_id, role)
SELECT '8a5d1d7f-3900-43cd-91cd-63bc5ce064c9', 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '8a5d1d7f-3900-43cd-91cd-63bc5ce064c9' 
  AND role = 'admin'
);

-- 7. Crear trigger para updated_at en user_roles
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Política para user_roles: solo admins pueden gestionarla
CREATE POLICY "Only admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- Los usuarios pueden ver sus propios roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());