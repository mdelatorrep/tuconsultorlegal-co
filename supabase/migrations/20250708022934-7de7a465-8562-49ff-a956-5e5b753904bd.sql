-- Add final price field that only admin can set
ALTER TABLE public.legal_agents 
ADD COLUMN IF NOT EXISTS final_price INTEGER,
ADD COLUMN IF NOT EXISTS price_approved_by UUID,
ADD COLUMN IF NOT EXISTS price_approved_at TIMESTAMP WITH TIME ZONE;

-- Add foreign key for price approver
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_price_approved_by'
  ) THEN
    ALTER TABLE public.legal_agents 
    ADD CONSTRAINT fk_price_approved_by 
    FOREIGN KEY (price_approved_by) 
    REFERENCES public.lawyer_accounts(id);
  END IF;
END $$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.lawyer_accounts 
    WHERE access_token = current_setting('request.headers', true)::json->>'authorization'
    AND is_admin = true 
    AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update existing agents to use suggested_price as final_price if not set
UPDATE public.legal_agents 
SET final_price = suggested_price 
WHERE final_price IS NULL;