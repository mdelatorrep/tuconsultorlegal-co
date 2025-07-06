-- Add user_observations field to document_tokens table
ALTER TABLE public.document_tokens 
ADD COLUMN user_observations TEXT DEFAULT NULL;

-- Add user_observation_date field to track when observations were made
ALTER TABLE public.document_tokens 
ADD COLUMN user_observation_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;