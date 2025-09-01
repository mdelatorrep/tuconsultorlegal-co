-- Create table for training interactions
CREATE TABLE IF NOT EXISTS public.training_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL,
  module_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  assistant_response TEXT NOT NULL,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.training_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for training interactions
CREATE POLICY "Lawyers can view their own training interactions" 
ON public.training_interactions 
FOR SELECT 
USING (auth.uid()::text = lawyer_id::text);

CREATE POLICY "Lawyers can create their own training interactions" 
ON public.training_interactions 
FOR INSERT 
WITH CHECK (auth.uid()::text = lawyer_id::text);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_training_interactions_lawyer_module 
ON public.training_interactions(lawyer_id, module_id, created_at DESC);