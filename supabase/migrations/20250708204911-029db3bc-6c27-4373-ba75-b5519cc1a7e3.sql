-- Fix authentication by enabling required extensions and updating password handling
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the existing account password to use proper bcrypt hashing
UPDATE public.lawyer_accounts 
SET password_hash = crypt('admin123', gen_salt('bf', 12))
WHERE email = 'abogado@consultorjalegal.com';