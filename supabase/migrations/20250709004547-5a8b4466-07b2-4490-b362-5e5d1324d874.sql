-- Fix the verify_admin_password function to properly verify bcrypt hashes
CREATE OR REPLACE FUNCTION public.verify_admin_password(password text, email_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM public.lawyer_accounts 
  WHERE email = email_param AND active = true;
  
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Use crypt function to verify bcrypt hash
  RETURN stored_hash = crypt(password, stored_hash);
END;
$function$