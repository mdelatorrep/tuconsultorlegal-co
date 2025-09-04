-- Create table for legal tools results
CREATE TABLE IF NOT EXISTS public.legal_tools_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_type TEXT NOT NULL CHECK (tool_type IN ('research', 'analysis', 'draft', 'integration')),
  input_data JSONB NOT NULL DEFAULT '{}',
  output_data JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_tools_results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Lawyers can view their own results" 
ON public.legal_tools_results 
FOR SELECT 
USING (auth.uid() = lawyer_id);

CREATE POLICY "Lawyers can create their own results" 
ON public.legal_tools_results 
FOR INSERT 
WITH CHECK (auth.uid() = lawyer_id);

CREATE POLICY "Lawyers can update their own results" 
ON public.legal_tools_results 
FOR UPDATE 
USING (auth.uid() = lawyer_id);

CREATE POLICY "Service role can manage legal tools results" 
ON public.legal_tools_results 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Add trigger for updated_at
CREATE TRIGGER update_legal_tools_results_updated_at
BEFORE UPDATE ON public.legal_tools_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();