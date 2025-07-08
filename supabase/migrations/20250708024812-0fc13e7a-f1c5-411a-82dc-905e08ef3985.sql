-- Add trigger to automatically hash passwords on insert
CREATE OR REPLACE FUNCTION public.hash_password_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only hash if password_hash looks like plain text (not already hashed)
  IF NEW.password_hash IS NOT NULL AND LENGTH(NEW.password_hash) < 60 THEN
    NEW.password_hash := public.hash_password(NEW.password_hash);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic password hashing
DROP TRIGGER IF EXISTS trigger_hash_password_on_insert ON public.lawyer_accounts;
CREATE TRIGGER trigger_hash_password_on_insert
  BEFORE INSERT ON public.lawyer_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_password_on_insert();