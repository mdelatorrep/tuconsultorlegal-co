-- Create draft-specific tables for conversation blocks and field instructions
-- 1) agent_draft_blocks
CREATE TABLE IF NOT EXISTS public.agent_draft_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_draft_id UUID NOT NULL REFERENCES public.agent_drafts(id) ON DELETE CASCADE,
  block_name TEXT NOT NULL,
  intro_phrase TEXT NOT NULL,
  placeholders JSONB NOT NULL DEFAULT '[]'::jsonb,
  block_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) agent_draft_field_instructions
CREATE TABLE IF NOT EXISTS public.agent_draft_field_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_draft_id UUID NOT NULL REFERENCES public.agent_drafts(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  validation_rule TEXT,
  help_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_draft_blocks_draft ON public.agent_draft_blocks(agent_draft_id);
CREATE INDEX IF NOT EXISTS idx_agent_draft_blocks_order ON public.agent_draft_blocks(agent_draft_id, block_order);
CREATE INDEX IF NOT EXISTS idx_agent_draft_field_instr_draft ON public.agent_draft_field_instructions(agent_draft_id);

-- Enable Row Level Security
ALTER TABLE public.agent_draft_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_draft_field_instructions ENABLE ROW LEVEL SECURITY;

-- Policies: service role full access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_draft_blocks' AND policyname = 'Service role can manage agent draft blocks'
  ) THEN
    CREATE POLICY "Service role can manage agent draft blocks"
    ON public.agent_draft_blocks
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_draft_field_instructions' AND policyname = 'Service role can manage agent draft field instructions'
  ) THEN
    CREATE POLICY "Service role can manage agent draft field instructions"
    ON public.agent_draft_field_instructions
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Policies: lawyers can manage their own draft data (match agent_drafts.lawyer_id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_draft_blocks' AND policyname = 'Lawyers can manage their own draft blocks'
  ) THEN
    CREATE POLICY "Lawyers can manage their own draft blocks"
    ON public.agent_draft_blocks
    FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.agent_drafts d
      WHERE d.id = agent_draft_id AND d.lawyer_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.agent_drafts d
      WHERE d.id = agent_draft_id AND d.lawyer_id = auth.uid()
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_draft_field_instructions' AND policyname = 'Lawyers can manage their own draft field instructions'
  ) THEN
    CREATE POLICY "Lawyers can manage their own draft field instructions"
    ON public.agent_draft_field_instructions
    FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.agent_drafts d
      WHERE d.id = agent_draft_id AND d.lawyer_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.agent_drafts d
      WHERE d.id = agent_draft_id AND d.lawyer_id = auth.uid()
    ));
  END IF;
END $$;

-- Triggers for updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_agent_draft_blocks_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_agent_draft_blocks_updated_at
    BEFORE UPDATE ON public.agent_draft_blocks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_agent_draft_field_instr_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_agent_draft_field_instr_updated_at
    BEFORE UPDATE ON public.agent_draft_field_instructions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;