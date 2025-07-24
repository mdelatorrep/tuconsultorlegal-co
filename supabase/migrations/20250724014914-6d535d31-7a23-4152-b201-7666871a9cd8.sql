-- Crear tabla para el progreso de formación de abogados
CREATE TABLE public.lawyer_training_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_tokens(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL DEFAULT 'IA Lawyer Fundamentals',
  modules_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_modules INTEGER NOT NULL DEFAULT 10,
  completion_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_certified BOOLEAN NOT NULL DEFAULT false,
  certificate_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para los badges/certificaciones
CREATE TABLE public.lawyer_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_tokens(id) ON DELETE CASCADE,
  certificate_type TEXT NOT NULL DEFAULT 'ai_lawyer_fundamentals',
  certificate_name TEXT NOT NULL DEFAULT 'IA Lawyer Fundamentals',
  issued_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  certificate_code TEXT NOT NULL UNIQUE,
  verification_url TEXT,
  linkedin_share_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lawyer_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyer_certificates ENABLE ROW LEVEL SECURITY;

-- Create policies for training progress
CREATE POLICY "Lawyers can view their own training progress" 
ON public.lawyer_training_progress 
FOR SELECT 
USING (lawyer_id IN (SELECT id FROM public.lawyer_tokens WHERE lawyer_id = auth.uid()));

CREATE POLICY "Service role can manage training progress" 
ON public.lawyer_training_progress 
FOR ALL 
USING (true);

-- Create policies for certificates
CREATE POLICY "Lawyers can view their own certificates" 
ON public.lawyer_certificates 
FOR SELECT 
USING (lawyer_id IN (SELECT id FROM public.lawyer_tokens WHERE lawyer_id = auth.uid()));

CREATE POLICY "Anyone can view certificates by code" 
ON public.lawyer_certificates 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage certificates" 
ON public.lawyer_certificates 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lawyer_training_progress_updated_at
BEFORE UPDATE ON public.lawyer_training_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lawyer_certificates_updated_at
BEFORE UPDATE ON public.lawyer_certificates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_lawyer_training_progress_lawyer_id ON public.lawyer_training_progress(lawyer_id);
CREATE INDEX idx_lawyer_training_progress_completed ON public.lawyer_training_progress(is_certified, completed_at);
CREATE INDEX idx_lawyer_certificates_lawyer_id ON public.lawyer_certificates(lawyer_id);
CREATE INDEX idx_lawyer_certificates_code ON public.lawyer_certificates(certificate_code);
CREATE INDEX idx_lawyer_certificates_type ON public.lawyer_certificates(certificate_type);

-- Create function to automatically issue certificate when training is completed
CREATE OR REPLACE FUNCTION public.issue_certificate_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    lawyer_info RECORD;
    cert_code TEXT;
BEGIN
    -- Only trigger when completion percentage reaches 100% and is_certified becomes true
    IF NEW.completion_percentage >= 100.00 AND NEW.is_certified = true AND (OLD.is_certified IS NULL OR OLD.is_certified = false) THEN
        -- Get lawyer information
        SELECT lt.full_name, lt.email 
        INTO lawyer_info
        FROM lawyer_tokens lt 
        WHERE lt.id = NEW.lawyer_id;
        
        -- Generate unique certificate code
        cert_code := 'IALC-' || to_char(now(), 'YYYY') || '-' || substr(md5(random()::text), 1, 8);
        
        -- Set certificate_id in training progress
        NEW.certificate_id := cert_code;
        
        -- Insert certificate record
        INSERT INTO public.lawyer_certificates (
            lawyer_id,
            certificate_type,
            certificate_name,
            certificate_code,
            verification_url,
            linkedin_share_url
        ) VALUES (
            NEW.lawyer_id,
            'ai_lawyer_fundamentals',
            'Certificación IA Lawyer Fundamentals - tuconsultorlegal.co',
            cert_code,
            'https://tuconsultorlegal.co/certificacion/' || cert_code,
            'https://www.linkedin.com/sharing/share-offsite/?url=https://tuconsultorlegal.co/certificacion/' || cert_code
        );
        
        RAISE LOG 'Certificate issued for lawyer: % with code: %', lawyer_info.full_name, cert_code;
    END IF;
    
    RETURN NEW;
END;
$$;