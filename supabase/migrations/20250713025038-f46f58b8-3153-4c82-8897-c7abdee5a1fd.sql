-- Crear tabla para categorías de documentos administradas
CREATE TABLE public.document_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  icon text DEFAULT 'FileText',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (anyone can see categories)
CREATE POLICY "Anyone can view active categories" 
ON public.document_categories 
FOR SELECT 
USING (is_active = true);

-- Admin can manage categories
CREATE POLICY "Service role can manage categories" 
ON public.document_categories 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_document_categories_updated_at
BEFORE UPDATE ON public.document_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.document_categories (name, description, icon) VALUES
('Contratos', 'Contratos en general', 'FileText'),
('Inmobiliario', 'Documentos relacionados con bienes raíces', 'Home'),
('Laboral', 'Contratos y documentos laborales', 'Users'),
('Comercial', 'Documentos comerciales y empresariales', 'Building'),
('Civil', 'Documentos de derecho civil', 'Scale'),
('Administrativo', 'Documentos administrativos', 'Settings'),
('Familia', 'Derecho de familia', 'Heart'),
('Penal', 'Documentos penales', 'Shield'),
('Societario', 'Constitución y gestión de sociedades', 'Building2'),
('Tributario', 'Documentos fiscales y tributarios', 'Calculator');