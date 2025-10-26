-- Add form_data column to store captured user information
ALTER TABLE public.document_tokens 
ADD COLUMN form_data JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN public.document_tokens.form_data IS 'Stores the captured form data (placeholders and their values) from the user';