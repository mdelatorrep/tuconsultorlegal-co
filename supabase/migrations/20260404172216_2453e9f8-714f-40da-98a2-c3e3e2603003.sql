-- Create bug_reports table
CREATE TABLE public.bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bug', 'performance', 'data', 'suggestion', 'other')),
  affected_tool TEXT,
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 2000),
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Lawyers can view their own reports
CREATE POLICY "Lawyers can view own bug reports"
ON public.bug_reports FOR SELECT
TO authenticated
USING (lawyer_id = auth.uid());

-- Lawyers can create their own reports
CREATE POLICY "Lawyers can create bug reports"
ON public.bug_reports FOR INSERT
TO authenticated
WITH CHECK (lawyer_id = auth.uid());

-- Admins can view all reports
CREATE POLICY "Admins can view all bug reports"
ON public.bug_reports FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = auth.uid() AND active = true
  )
);

-- Admins can update any report
CREATE POLICY "Admins can update bug reports"
ON public.bug_reports FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = auth.uid() AND active = true
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_bug_reports_updated_at
BEFORE UPDATE ON public.bug_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_bug_reports_lawyer_id ON public.bug_reports(lawyer_id);
CREATE INDEX idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX idx_bug_reports_created_at ON public.bug_reports(created_at DESC);