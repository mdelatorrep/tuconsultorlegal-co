-- Step 1: Create admin_accounts table
CREATE TABLE public.admin_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  password_reset_token TEXT,
  password_reset_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 2: Create lawyer_token_requests table (waiting list)
CREATE TABLE public.lawyer_token_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  law_firm TEXT,
  specialization TEXT,
  years_of_experience INTEGER,
  reason_for_request TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.admin_accounts(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 3: Create lawyer_tokens table  
CREATE TABLE public.lawyer_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  access_token TEXT NOT NULL UNIQUE,
  can_create_agents BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  request_id UUID REFERENCES public.lawyer_token_requests(id),
  created_by UUID REFERENCES public.admin_accounts(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 4: Migrate existing admin data
INSERT INTO public.admin_accounts (id, email, password_hash, full_name, is_super_admin, active, last_login_at, failed_login_attempts, locked_until, created_at, updated_at)
SELECT 
  id, 
  email, 
  password_hash, 
  full_name, 
  true as is_super_admin, -- existing admins become super admins
  active, 
  last_login_at, 
  failed_login_attempts, 
  locked_until, 
  created_at, 
  updated_at
FROM public.lawyer_accounts 
WHERE is_admin = true;

-- Step 5: Migrate existing lawyer data to token requests (auto-approved)
INSERT INTO public.lawyer_token_requests (id, full_name, email, phone_number, status, reviewed_at, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  full_name, 
  email, 
  phone_number,
  'approved' as status,
  created_at as reviewed_at,
  created_at, 
  updated_at
FROM public.lawyer_accounts 
WHERE is_admin = false;

-- Step 6: Migrate existing lawyers to tokens table
INSERT INTO public.lawyer_tokens (lawyer_id, full_name, email, phone_number, access_token, can_create_agents, active, token_expires_at, last_used_at, created_at, updated_at)
SELECT 
  id as lawyer_id,
  full_name, 
  email, 
  phone_number,
  access_token,
  can_create_agents, 
  active, 
  token_expires_at, 
  last_login_at as last_used_at,
  created_at, 
  updated_at
FROM public.lawyer_accounts 
WHERE is_admin = false;

-- Step 7: Enable RLS on new tables
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyer_token_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyer_tokens ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for admin_accounts
CREATE POLICY "Admins can manage admin accounts" 
ON public.admin_accounts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_accounts a
    WHERE a.id = auth.uid()::uuid AND a.active = true
  )
);

-- Step 9: Create RLS policies for lawyer_token_requests
CREATE POLICY "Admins can manage token requests" 
ON public.lawyer_token_requests 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_accounts a
    WHERE a.id = auth.uid()::uuid AND a.active = true
  )
);

CREATE POLICY "Users can create their own token request" 
ON public.lawyer_token_requests 
FOR INSERT 
WITH CHECK (true); -- Anyone can request a token

CREATE POLICY "Users can view their own token request" 
ON public.lawyer_token_requests 
FOR SELECT 
USING (email = (auth.jwt() ->> 'email'));

-- Step 10: Create RLS policies for lawyer_tokens
CREATE POLICY "Admins can manage lawyer tokens" 
ON public.lawyer_tokens 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_accounts a
    WHERE a.id = auth.uid()::uuid AND a.active = true
  )
);

CREATE POLICY "Lawyers can view their own token info" 
ON public.lawyer_tokens 
FOR SELECT 
USING (access_token = ((current_setting('request.headers', true))::json ->> 'authorization'));

-- Step 11: Create updated_at triggers
CREATE TRIGGER update_admin_accounts_updated_at
  BEFORE UPDATE ON public.admin_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lawyer_token_requests_updated_at
  BEFORE UPDATE ON public.lawyer_token_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lawyer_tokens_updated_at
  BEFORE UPDATE ON public.lawyer_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 12: Update legal_agents foreign key references
UPDATE public.legal_agents 
SET created_by = (
  SELECT lawyer_id 
  FROM public.lawyer_tokens 
  WHERE lawyer_tokens.lawyer_id = legal_agents.created_by
  LIMIT 1
)
WHERE created_by IS NOT NULL;

-- Step 13: Update is_admin_user function to work with new tables
CREATE OR REPLACE FUNCTION public.is_admin_user(auth_token text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  token_to_check TEXT;
BEGIN
  -- Use provided token or try to get from headers
  token_to_check := COALESCE(auth_token, 
    CASE 
      WHEN current_setting('request.headers', true) IS NOT NULL 
      THEN current_setting('request.headers', true)::json->>'authorization'
      ELSE NULL 
    END
  );
  
  IF token_to_check IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if it's a valid admin session token
  RETURN EXISTS (
    SELECT 1 FROM public.admin_accounts 
    WHERE id = auth.uid()::uuid 
    AND active = true
  );
END;
$function$;

-- Step 14: Create function to verify lawyer tokens
CREATE OR REPLACE FUNCTION public.is_valid_lawyer_token(token text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.lawyer_tokens 
    WHERE access_token = token 
    AND active = true 
    AND (token_expires_at IS NULL OR token_expires_at > now())
  );
END;
$function$;

-- Step 15: Create function to get lawyer info by token
CREATE OR REPLACE FUNCTION public.get_lawyer_by_token(token text)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  email TEXT,
  can_create_agents BOOLEAN
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    lt.lawyer_id as id,
    lt.full_name,
    lt.email,
    lt.can_create_agents
  FROM public.lawyer_tokens lt
  WHERE lt.access_token = token 
    AND lt.active = true 
    AND (lt.token_expires_at IS NULL OR lt.token_expires_at > now());
END;
$function$;