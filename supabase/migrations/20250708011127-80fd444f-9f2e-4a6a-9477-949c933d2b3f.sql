-- Add permission field for agent creation functionality
ALTER TABLE public.lawyer_accounts 
ADD COLUMN can_create_agents boolean NOT NULL DEFAULT false;

-- Add some example data for testing (you can remove this later)
COMMENT ON COLUMN public.lawyer_accounts.can_create_agents IS 'Determines if the lawyer can access the agent creation interface';