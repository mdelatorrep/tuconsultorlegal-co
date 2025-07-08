-- Add phone number column to lawyer_accounts table
ALTER TABLE public.lawyer_accounts 
ADD COLUMN phone_number text;

-- Add comment for documentation
COMMENT ON COLUMN public.lawyer_accounts.phone_number IS 'International phone number with country code';