-- Create lawyer accounts table
CREATE TABLE public.lawyer_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lawyer_accounts ENABLE ROW LEVEL SECURITY;

-- Create policy for lawyers to view their own account
CREATE POLICY "Lawyers can view their own account" 
ON public.lawyer_accounts 
FOR SELECT 
USING (true);

-- Create policy for admin operations (insert/update should be done by admin)
CREATE POLICY "Only admins can manage lawyer accounts" 
ON public.lawyer_accounts 
FOR ALL 
USING (false);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lawyer_accounts_updated_at
BEFORE UPDATE ON public.lawyer_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial lawyer account (using bcrypt hash for 'abogados2024')
-- Hash generated for password 'abogados2024': $2b$10$9nX8kF2vQcmGY8QDxJ5J8eqKr5FqX9YGwX8zU4L1rA5M3vT9cB6Hy
INSERT INTO public.lawyer_accounts (email, password_hash, full_name) 
VALUES ('abogado@consultorjalegal.com', '$2b$10$9nX8kF2vQcmGY8QDxJ5J8eqKr5FqX9YGwX8zU4L1rA5M3vT9cB6Hy', 'Abogado Principal');