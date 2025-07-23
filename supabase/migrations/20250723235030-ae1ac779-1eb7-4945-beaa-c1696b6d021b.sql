-- Asegurar que la tabla de categorías tenga la estructura correcta
-- Primero verificar si ya existe la tabla document_categories
DO $$ 
BEGIN
    -- Si la tabla no existe, crearla
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'document_categories') THEN
        CREATE TABLE public.document_categories (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            icon TEXT DEFAULT 'FileText',
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            category_type TEXT DEFAULT 'document' CHECK (category_type IN ('document', 'knowledge_base', 'both')),
            display_order INTEGER DEFAULT 1,
            color_class TEXT DEFAULT 'bg-blue-100 text-blue-800'
        );

        -- Habilitar RLS
        ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

        -- Crear políticas
        CREATE POLICY "Anyone can view active categories" 
        ON public.document_categories 
        FOR SELECT 
        USING (is_active = true);

        CREATE POLICY "Service role can manage categories" 
        ON public.document_categories 
        FOR ALL 
        USING (true)
        WITH CHECK (true);

        -- Crear trigger para updated_at
        CREATE TRIGGER update_document_categories_updated_at
            BEFORE UPDATE ON public.document_categories
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    ELSE
        -- Si la tabla existe, agregar columnas faltantes
        ALTER TABLE public.document_categories 
        ADD COLUMN IF NOT EXISTS category_type TEXT DEFAULT 'document' CHECK (category_type IN ('document', 'knowledge_base', 'both'));
        
        ALTER TABLE public.document_categories 
        ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 1;
        
        ALTER TABLE public.document_categories 
        ADD COLUMN IF NOT EXISTS color_class TEXT DEFAULT 'bg-blue-100 text-blue-800';
    END IF;
END $$;

-- Insertar categorías predeterminadas si no existen
INSERT INTO public.document_categories (name, description, icon, category_type, display_order, color_class) VALUES 
('Contratos', 'Documentos contractuales y acuerdos', 'FileText', 'document', 1, 'bg-blue-100 text-blue-800'),
('Laboral', 'Documentos de derecho laboral', 'Briefcase', 'document', 2, 'bg-green-100 text-green-800'),
('Comercial', 'Documentos de derecho comercial', 'Building2', 'document', 3, 'bg-purple-100 text-purple-800'),
('Civil', 'Documentos de derecho civil', 'Users', 'document', 4, 'bg-orange-100 text-orange-800'),
('Administrativo', 'Documentos administrativos', 'Shield', 'document', 5, 'bg-red-100 text-red-800'),
('Legislación', 'Fuentes de legislación y normatividad', 'BookOpen', 'knowledge_base', 6, 'bg-indigo-100 text-indigo-800'),
('Jurisprudencia', 'Jurisprudencia y decisiones judiciales', 'Gavel', 'knowledge_base', 7, 'bg-pink-100 text-pink-800'),
('Normatividad', 'Normatividad local y distrital', 'FileCheck', 'knowledge_base', 8, 'bg-teal-100 text-teal-800'),
('Doctrina', 'Doctrina jurídica', 'BookOpenCheck', 'knowledge_base', 9, 'bg-yellow-100 text-yellow-800'),
('General', 'Categoría general', 'Archive', 'both', 10, 'bg-gray-100 text-gray-800')
ON CONFLICT (name) DO NOTHING;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_document_categories_type ON public.document_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_document_categories_active ON public.document_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_document_categories_order ON public.document_categories(display_order);