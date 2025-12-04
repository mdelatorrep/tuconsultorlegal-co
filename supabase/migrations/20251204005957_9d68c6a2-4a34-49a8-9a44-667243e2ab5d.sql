-- Create research queue table for intelligent rate limiting
CREATE TABLE IF NOT EXISTS public.research_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL,
  query TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rate_limited')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  openai_task_id TEXT,
  result_id UUID REFERENCES public.legal_tools_results(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Create index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_research_queue_status ON public.research_queue(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_research_queue_lawyer ON public.research_queue(lawyer_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.research_queue ENABLE ROW LEVEL SECURITY;

-- Policies for research queue
CREATE POLICY "Lawyers can view their own queue items"
ON public.research_queue FOR SELECT
USING (auth.uid() = lawyer_id);

CREATE POLICY "System can manage all queue items"
ON public.research_queue FOR ALL
USING (true)
WITH CHECK (true);

-- Create system config for queue settings if not exists
INSERT INTO public.system_config (config_key, config_value, description)
VALUES 
  ('research_queue_min_spacing_seconds', '180', 'Minimum seconds between research requests (3 minutes)')
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.system_config (config_key, config_value, description)
VALUES 
  ('research_queue_max_concurrent', '1', 'Maximum concurrent research tasks')
ON CONFLICT (config_key) DO NOTHING;

-- Function to get next available slot time
CREATE OR REPLACE FUNCTION public.get_next_research_slot()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  min_spacing INTEGER;
  last_started TIMESTAMPTZ;
  next_slot TIMESTAMPTZ;
BEGIN
  -- Get minimum spacing from config (default 180 seconds = 3 minutes)
  SELECT COALESCE(config_value::INTEGER, 180) INTO min_spacing
  FROM system_config WHERE config_key = 'research_queue_min_spacing_seconds';
  
  -- Get the last started research task
  SELECT started_at INTO last_started
  FROM research_queue
  WHERE status IN ('processing', 'completed')
    AND started_at IS NOT NULL
  ORDER BY started_at DESC
  LIMIT 1;
  
  -- Calculate next available slot
  IF last_started IS NULL THEN
    next_slot := now();
  ELSE
    next_slot := GREATEST(now(), last_started + (min_spacing || ' seconds')::INTERVAL);
  END IF;
  
  RETURN next_slot;
END;
$$;

-- Function to add item to research queue
CREATE OR REPLACE FUNCTION public.add_to_research_queue(
  p_lawyer_id UUID,
  p_query TEXT,
  p_priority INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
  next_slot TIMESTAMPTZ;
BEGIN
  -- Get next available slot
  next_slot := get_next_research_slot();
  
  -- Insert into queue
  INSERT INTO research_queue (lawyer_id, query, priority, next_retry_at)
  VALUES (p_lawyer_id, p_query, p_priority, next_slot)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Function to get next queued research
CREATE OR REPLACE FUNCTION public.get_next_research_from_queue()
RETURNS TABLE(
  queue_id UUID,
  lawyer_id UUID,
  query TEXT,
  retry_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_concurrent INTEGER;
  current_processing INTEGER;
BEGIN
  -- Get max concurrent from config
  SELECT COALESCE(config_value::INTEGER, 1) INTO max_concurrent
  FROM system_config WHERE config_key = 'research_queue_max_concurrent';
  
  -- Count currently processing
  SELECT COUNT(*) INTO current_processing
  FROM research_queue
  WHERE status = 'processing';
  
  -- If at capacity, return empty
  IF current_processing >= max_concurrent THEN
    RETURN;
  END IF;
  
  -- Get next item ready to process
  RETURN QUERY
  SELECT rq.id, rq.lawyer_id, rq.query, rq.retry_count
  FROM research_queue rq
  WHERE rq.status IN ('pending', 'rate_limited')
    AND (rq.next_retry_at IS NULL OR rq.next_retry_at <= now())
    AND rq.retry_count < rq.max_retries
  ORDER BY rq.priority DESC, rq.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$;