-- Tabla para perfiles públicos de abogados
CREATE TABLE public.lawyer_public_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  profile_photo TEXT,
  specialties TEXT[] DEFAULT '{}',
  years_of_experience INTEGER,
  bio TEXT,
  services JSONB DEFAULT '[]',
  testimonials JSONB DEFAULT '[]',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_lawyer_profile UNIQUE(lawyer_id)
);

-- Índices para búsqueda
CREATE INDEX idx_lawyer_public_profiles_slug ON public.lawyer_public_profiles(slug);
CREATE INDEX idx_lawyer_public_profiles_lawyer_id ON public.lawyer_public_profiles(lawyer_id);
CREATE INDEX idx_lawyer_public_profiles_published ON public.lawyer_public_profiles(is_published);

-- Tabla para leads del CRM que llegan desde las páginas públicas
CREATE TABLE public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  origin TEXT DEFAULT 'Página de perfil público',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para leads
CREATE INDEX idx_crm_leads_lawyer_id ON public.crm_leads(lawyer_id);
CREATE INDEX idx_crm_leads_status ON public.crm_leads(status);
CREATE INDEX idx_crm_leads_created_at ON public.crm_leads(created_at DESC);

-- RLS para perfiles públicos
ALTER TABLE public.lawyer_public_profiles ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede ver perfiles publicados (sin autenticación)
CREATE POLICY "Anyone can view published profiles"
ON public.lawyer_public_profiles
FOR SELECT
USING (is_published = true);

-- Los abogados pueden gestionar su propio perfil
CREATE POLICY "Lawyers can manage their own profile"
ON public.lawyer_public_profiles
FOR ALL
USING (auth.uid() = lawyer_id)
WITH CHECK (auth.uid() = lawyer_id);

-- Service role puede gestionar todos los perfiles
CREATE POLICY "Service role can manage all profiles"
ON public.lawyer_public_profiles
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- RLS para leads
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede crear leads (formulario público)
CREATE POLICY "Anyone can create leads"
ON public.crm_leads
FOR INSERT
WITH CHECK (true);

-- Los abogados pueden ver y gestionar sus propios leads
CREATE POLICY "Lawyers can manage their own leads"
ON public.crm_leads
FOR ALL
USING (auth.uid() = lawyer_id)
WITH CHECK (auth.uid() = lawyer_id);

-- Service role puede gestionar todos los leads
CREATE POLICY "Service role can manage all leads"
ON public.crm_leads
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Trigger para actualizar updated_at
CREATE TRIGGER update_lawyer_public_profiles_updated_at
BEFORE UPDATE ON public.lawyer_public_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_leads_updated_at
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();