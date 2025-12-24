-- Add case_id and client_id to monitored_processes for linking to CRM
ALTER TABLE public.monitored_processes 
  ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES public.crm_cases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.crm_clients(id) ON DELETE SET NULL;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_monitored_processes_case_id ON public.monitored_processes(case_id);
CREATE INDEX IF NOT EXISTS idx_monitored_processes_client_id ON public.monitored_processes(client_id);

-- Add index for legal_calendar_events if not exists
CREATE INDEX IF NOT EXISTS idx_legal_calendar_events_case_id ON public.legal_calendar_events(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_calendar_events_client_id ON public.legal_calendar_events(client_id);

-- Comments for documentation
COMMENT ON COLUMN public.monitored_processes.case_id IS 'Optional link to CRM case for integrated tracking';
COMMENT ON COLUMN public.monitored_processes.client_id IS 'Optional link to CRM client for filtered views';