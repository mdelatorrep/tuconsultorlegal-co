-- Add lawyer comments fields to document_tokens table
ALTER TABLE document_tokens
ADD COLUMN lawyer_comments TEXT,
ADD COLUMN lawyer_comments_date TIMESTAMP WITH TIME ZONE;