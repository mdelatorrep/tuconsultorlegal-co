-- Create table for storing legal document agents
CREATE TABLE public.legal_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  template_content TEXT NOT NULL,
  ai_prompt TEXT NOT NULL,
  placeholder_fields JSONB NOT NULL DEFAULT '[]',
  suggested_price INTEGER NOT NULL,
  price_justification TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'draft')),
  created_by UUID REFERENCES public.lawyer_accounts(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Indexes for better performance
  CONSTRAINT legal_agents_name_unique UNIQUE (name)
);

-- Enable Row Level Security
ALTER TABLE public.legal_agents ENABLE ROW LEVEL SECURITY;

-- Create policies for agent access
CREATE POLICY "Anyone can view active agents" 
ON public.legal_agents 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Lawyers can view their own agents" 
ON public.legal_agents 
FOR SELECT 
USING (created_by IN (SELECT id FROM public.lawyer_accounts WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Lawyers can create agents" 
ON public.legal_agents 
FOR INSERT 
WITH CHECK (created_by IN (SELECT id FROM public.lawyer_accounts WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Lawyers can update their own agents" 
ON public.legal_agents 
FOR UPDATE 
USING (created_by IN (SELECT id FROM public.lawyer_accounts WHERE email = auth.jwt() ->> 'email'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_legal_agents_updated_at
BEFORE UPDATE ON public.legal_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add some indexes for performance
CREATE INDEX idx_legal_agents_status ON public.legal_agents(status);
CREATE INDEX idx_legal_agents_category ON public.legal_agents(category);
CREATE INDEX idx_legal_agents_created_by ON public.legal_agents(created_by);