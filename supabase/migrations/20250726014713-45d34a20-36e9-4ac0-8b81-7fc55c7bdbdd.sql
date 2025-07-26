-- Crear tabla de perfiles para abogados
CREATE TABLE public.lawyer_profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null unique,
  can_create_agents boolean default false,
  can_create_blogs boolean default false,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Habilitar RLS en la tabla
ALTER TABLE public.lawyer_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para lawyer_profiles
CREATE POLICY "Lawyers can view their own profile" 
ON public.lawyer_profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Lawyers can update their own profile" 
ON public.lawyer_profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_lawyer_profiles_updated_at
BEFORE UPDATE ON public.lawyer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para manejar nuevos usuarios abogados
CREATE OR REPLACE FUNCTION public.handle_new_lawyer_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Solo crear perfil si tiene metadata de abogado
  IF NEW.raw_user_meta_data ? 'is_lawyer' AND (NEW.raw_user_meta_data ->> 'is_lawyer')::boolean THEN
    INSERT INTO public.lawyer_profiles (
      id, 
      full_name, 
      email,
      can_create_agents,
      can_create_blogs
    )
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuario'),
      NEW.email,
      COALESCE((NEW.raw_user_meta_data ->> 'can_create_agents')::boolean, false),
      COALESCE((NEW.raw_user_meta_data ->> 'can_create_blogs')::boolean, false)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para crear perfil automáticamente cuando se registra un abogado
CREATE TRIGGER on_lawyer_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_lawyer_user();