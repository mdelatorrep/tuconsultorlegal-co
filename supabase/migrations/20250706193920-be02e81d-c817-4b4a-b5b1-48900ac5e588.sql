-- Remove password_hash column and add access_token
ALTER TABLE public.lawyer_accounts 
DROP COLUMN password_hash;

ALTER TABLE public.lawyer_accounts 
ADD COLUMN access_token TEXT NOT NULL DEFAULT '';

-- Update the existing lawyer account with a clear token
UPDATE public.lawyer_accounts 
SET access_token = 'ABOGADO2024' 
WHERE email = 'abogado@consultorjalegal.com';

-- Make access_token not null and unique
ALTER TABLE public.lawyer_accounts 
ALTER COLUMN access_token DROP DEFAULT;

ALTER TABLE public.lawyer_accounts 
ADD CONSTRAINT unique_access_token UNIQUE (access_token);