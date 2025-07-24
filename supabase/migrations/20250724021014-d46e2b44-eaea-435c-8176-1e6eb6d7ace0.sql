-- Crear tabla para validaciones de formación
CREATE TABLE IF NOT EXISTS public.training_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lawyer_id UUID NOT NULL,
    module_id TEXT NOT NULL,
    module_title TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_evaluation JSONB NOT NULL DEFAULT '{}'::jsonb,
    passed BOOLEAN NOT NULL DEFAULT false,
    score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER NOT NULL DEFAULT 100,
    validated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_training_validations_lawyer_id ON public.training_validations(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_training_validations_module_id ON public.training_validations(module_id);
CREATE INDEX IF NOT EXISTS idx_training_validations_passed ON public.training_validations(passed);

-- RLS policies
ALTER TABLE public.training_validations ENABLE ROW LEVEL SECURITY;

-- Service role puede gestionar todas las validaciones
CREATE POLICY "Service role can manage all training validations"
ON public.training_validations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Los abogados pueden ver sus propias validaciones
CREATE POLICY "Lawyers can view their own validations"
ON public.training_validations
FOR SELECT
TO public
USING (
    lawyer_id IN (
        SELECT id FROM public.lawyer_tokens 
        WHERE lawyer_id = auth.uid() AND active = true
    )
);

-- Trigger para actualizar updated_at
CREATE OR REPLACE TRIGGER update_training_validations_updated_at
    BEFORE UPDATE ON public.training_validations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Extender tabla de progreso de formación para incluir validaciones
ALTER TABLE public.lawyer_training_progress 
ADD COLUMN IF NOT EXISTS current_module_id TEXT,
ADD COLUMN IF NOT EXISTS validation_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_validation_score INTEGER,
ADD COLUMN IF NOT EXISTS validation_history JSONB DEFAULT '[]'::jsonb;