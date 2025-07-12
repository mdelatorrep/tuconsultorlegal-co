-- Create lawyer token request system tables

-- Create lawyer_token_requests table to store requests from lawyers
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
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lawyer_token_requests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert requests (public form)
CREATE POLICY "Anyone can create token requests" 
ON public.lawyer_token_requests 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow admins to view all requests (using service role)
CREATE POLICY "Service role can view all requests" 
ON public.lawyer_token_requests 
FOR SELECT 
USING (true);

-- Create policy to allow admins to update requests (using service role)
CREATE POLICY "Service role can update requests" 
ON public.lawyer_token_requests 
FOR UPDATE 
USING (true);

-- Create admin_accounts table for admin management
CREATE TABLE public.admin_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage admin accounts" 
ON public.admin_accounts 
FOR ALL 
USING (true);

-- Create lawyer_tokens table for approved lawyers
CREATE TABLE public.lawyer_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  access_token TEXT NOT NULL UNIQUE,
  can_create_agents BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  request_id UUID REFERENCES public.lawyer_token_requests(id),
  created_by UUID REFERENCES public.admin_accounts(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.lawyer_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage lawyer tokens" 
ON public.lawyer_tokens 
FOR ALL 
USING (true);

-- Create triggers for updated_at columns
CREATE TRIGGER update_lawyer_token_requests_updated_at
BEFORE UPDATE ON public.lawyer_token_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_accounts_updated_at
BEFORE UPDATE ON public.admin_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lawyer_tokens_updated_at
BEFORE UPDATE ON public.lawyer_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default admin account for testing
INSERT INTO public.admin_accounts (full_name, email, is_super_admin) 
VALUES ('Super Admin', 'admin@example.com', true);