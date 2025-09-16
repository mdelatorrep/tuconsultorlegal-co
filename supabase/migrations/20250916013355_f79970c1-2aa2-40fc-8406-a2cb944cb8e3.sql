-- Create case activities table for traceability
CREATE TABLE public.crm_case_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES crm_cases(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  activity_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_case_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for case activities
CREATE POLICY "Lawyers can manage their own case activities"
ON public.crm_case_activities
FOR ALL
USING (lawyer_id = auth.uid());

CREATE POLICY "Service role can manage all case activities"
ON public.crm_case_activities
FOR ALL
USING (auth.role() = 'service_role'::text);

-- Create index for performance
CREATE INDEX idx_crm_case_activities_case_id ON public.crm_case_activities(case_id);
CREATE INDEX idx_crm_case_activities_lawyer_id ON public.crm_case_activities(lawyer_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_crm_case_activities_updated_at
BEFORE UPDATE ON public.crm_case_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();