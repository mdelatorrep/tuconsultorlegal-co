-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate the hash function properly
CREATE OR REPLACE FUNCTION public.hash_admin_token(token TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use pgcrypto extension for secure hashing
  RETURN crypt(token, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset the test account with a proper hashed password
-- Password will be: admin123
UPDATE public.lawyer_accounts 
SET 
  access_token = crypt('admin123', gen_salt('bf', 12)),
  failed_login_attempts = 0,
  locked_until = NULL
WHERE email = 'abogado@consultorjalegal.com';