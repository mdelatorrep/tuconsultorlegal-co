-- Add user_id column to admin_accounts table to link with auth.users
ALTER TABLE public.admin_accounts 
ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Update existing records to link with auth.users if they exist
-- For now, we'll leave them NULL and handle manually or through admin interface
-- This prevents breaking existing data

-- Add comment for documentation
COMMENT ON COLUMN public.admin_accounts.user_id IS 'Links admin account to auth.users for proper authentication';