
CREATE TABLE public.lawyer_journey_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  journey_step TEXT NOT NULL CHECK (journey_step IN ('day_1', 'day_3', 'day_7', 'day_14', 'day_30')),
  action_taken TEXT NOT NULL DEFAULT 'email',
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lawyer_id, journey_step)
);

ALTER TABLE public.lawyer_journey_tracking ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_journey_tracking_lawyer ON public.lawyer_journey_tracking(lawyer_id);
CREATE INDEX idx_journey_tracking_step ON public.lawyer_journey_tracking(journey_step);
