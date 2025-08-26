-- Add column to track which lawyer reviewed the document
ALTER TABLE public.document_tokens 
ADD COLUMN reviewed_by_lawyer_id UUID REFERENCES lawyer_profiles(id),
ADD COLUMN reviewed_by_lawyer_name TEXT;