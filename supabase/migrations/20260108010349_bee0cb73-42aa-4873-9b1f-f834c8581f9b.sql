-- Agregar campos necesarios para verificación y perfil completo del abogado
ALTER TABLE public.lawyer_profiles
ADD COLUMN IF NOT EXISTS document_type text,
ADD COLUMN IF NOT EXISTS document_number text,
ADD COLUMN IF NOT EXISTS professional_card_number text,
ADD COLUMN IF NOT EXISTS specialization text,
ADD COLUMN IF NOT EXISTS years_of_experience integer,
ADD COLUMN IF NOT EXISTS university text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS secondary_email text,
ADD COLUMN IF NOT EXISTS secondary_phone text;

-- Comentarios para documentar los campos
COMMENT ON COLUMN public.lawyer_profiles.document_type IS 'Tipo de documento: CC, CE, Pasaporte, etc.';
COMMENT ON COLUMN public.lawyer_profiles.document_number IS 'Número de documento de identidad';
COMMENT ON COLUMN public.lawyer_profiles.professional_card_number IS 'Número de tarjeta profesional';
COMMENT ON COLUMN public.lawyer_profiles.specialization IS 'Área de especialización legal';
COMMENT ON COLUMN public.lawyer_profiles.years_of_experience IS 'Años de experiencia profesional';
COMMENT ON COLUMN public.lawyer_profiles.university IS 'Universidad donde obtuvo el título';
COMMENT ON COLUMN public.lawyer_profiles.city IS 'Ciudad de ejercicio';
COMMENT ON COLUMN public.lawyer_profiles.address IS 'Dirección de oficina';
COMMENT ON COLUMN public.lawyer_profiles.secondary_email IS 'Correo electrónico secundario';
COMMENT ON COLUMN public.lawyer_profiles.secondary_phone IS 'Teléfono secundario';