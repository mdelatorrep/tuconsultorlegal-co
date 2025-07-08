-- Unlock the test account that got locked due to failed attempts
UPDATE public.lawyer_accounts 
SET 
  failed_login_attempts = 0,
  locked_until = NULL
WHERE email = 'abogado@consultorjalegal.com';