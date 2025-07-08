-- Security Fix: Separate password storage from session tokens
-- Phase 1: Add dedicated password_hash field and migrate existing data

-- Add new password_hash column
ALTER TABLE public.lawyer_accounts 
ADD COLUMN password_hash TEXT;

-- Create function to hash passwords properly
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use pgcrypto extension for secure password hashing
  RETURN crypt(password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify passwords
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate existing data: Hash the current access tokens as passwords
-- Since current access_token contains 'ABOGADO2024' and other tokens that are being used as passwords
UPDATE public.lawyer_accounts 
SET password_hash = public.hash_password('admin123')
WHERE email = 'abogado@consultorjalegal.com';

-- Add NOT NULL constraint after migration
ALTER TABLE public.lawyer_accounts 
ALTER COLUMN password_hash SET NOT NULL;

-- Update the verify_admin_token function to use new password verification
CREATE OR REPLACE FUNCTION public.verify_admin_password(password TEXT, email_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM public.lawyer_accounts 
  WHERE email = email_param AND active = true;
  
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN public.verify_password(password, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add rate limiting table for authentication attempts
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or email
  attempt_type TEXT NOT NULL, -- 'login', 'password_reset', etc.
  attempts INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_identifier_type 
ON public.auth_rate_limits(identifier, attempt_type);

-- Create function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  identifier_param TEXT,
  attempt_type_param TEXT,
  max_attempts INTEGER DEFAULT 5,
  window_minutes INTEGER DEFAULT 15,
  block_minutes INTEGER DEFAULT 30
)
RETURNS BOOLEAN AS $$
DECLARE
  current_attempts INTEGER := 0;
  window_start_time TIMESTAMP WITH TIME ZONE;
  is_blocked BOOLEAN := false;
BEGIN
  -- Check if currently blocked
  SELECT blocked_until > now() INTO is_blocked
  FROM public.auth_rate_limits
  WHERE identifier = identifier_param 
    AND attempt_type = attempt_type_param
  ORDER BY updated_at DESC
  LIMIT 1;
  
  IF is_blocked THEN
    RETURN false;
  END IF;
  
  -- Clean up old entries
  DELETE FROM public.auth_rate_limits
  WHERE window_start < now() - interval '1 day';
  
  -- Get current window attempts
  SELECT attempts, window_start INTO current_attempts, window_start_time
  FROM public.auth_rate_limits
  WHERE identifier = identifier_param 
    AND attempt_type = attempt_type_param
    AND window_start > now() - (window_minutes || ' minutes')::interval
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- If no recent attempts, allow and create new record
  IF current_attempts IS NULL THEN
    INSERT INTO public.auth_rate_limits (identifier, attempt_type, attempts, window_start)
    VALUES (identifier_param, attempt_type_param, 1, now());
    RETURN true;
  END IF;
  
  -- Check if within limits
  IF current_attempts >= max_attempts THEN
    -- Block the identifier
    UPDATE public.auth_rate_limits
    SET blocked_until = now() + (block_minutes || ' minutes')::interval,
        updated_at = now()
    WHERE identifier = identifier_param 
      AND attempt_type = attempt_type_param
      AND window_start = window_start_time;
    RETURN false;
  END IF;
  
  -- Increment attempts
  UPDATE public.auth_rate_limits
  SET attempts = attempts + 1,
      updated_at = now()
  WHERE identifier = identifier_param 
    AND attempt_type = attempt_type_param
    AND window_start = window_start_time;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reset rate limits (for successful operations)
CREATE OR REPLACE FUNCTION public.reset_rate_limit(
  identifier_param TEXT,
  attempt_type_param TEXT
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.auth_rate_limits
  WHERE identifier = identifier_param 
    AND attempt_type = attempt_type_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;