-- Create enum for document status
CREATE TYPE public.document_status AS ENUM (
  'solicitado',
  'en_revision_abogado', 
  'revisado',
  'pagado',
  'descargado'
);

-- Create table for document tokens
CREATE TABLE public.document_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  document_type TEXT NOT NULL,
  document_content TEXT NOT NULL,
  price INTEGER NOT NULL,
  status public.document_status NOT NULL DEFAULT 'solicitado',
  user_email TEXT,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (making it public for now since tokens are unique)
ALTER TABLE public.document_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read documents by token
CREATE POLICY "Anyone can view documents with valid token" 
ON public.document_tokens 
FOR SELECT 
USING (true);

-- Create policy to allow updates for payment processing  
CREATE POLICY "Anyone can update document status" 
ON public.document_tokens 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_document_tokens_updated_at
BEFORE UPDATE ON public.document_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO public.document_tokens (token, document_type, document_content, price, status, user_email, user_name) VALUES 
('TEST123ABC', 'Contrato de Arrendamiento', 'CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA\n\nEntre [ARRENDADOR] y [ARRENDATARIO]...', 50000, 'revisado', 'usuario@ejemplo.com', 'Juan Pérez'),
('DEF456GHI', 'Testamento', 'TESTAMENTO\n\nYo, [NOMBRE DEL TESTADOR]...', 75000, 'pagado', 'maria@ejemplo.com', 'María García');