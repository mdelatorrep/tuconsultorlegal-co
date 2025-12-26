-- Drop research_queue table and related functions
-- Research now uses synchronous API calls like other AI tools

-- Drop the table (this will cascade drop indexes and triggers)
DROP TABLE IF EXISTS public.research_queue CASCADE;

-- Drop related database functions
DROP FUNCTION IF EXISTS public.add_to_research_queue(uuid, text, integer);
DROP FUNCTION IF EXISTS public.get_next_research_from_queue();
DROP FUNCTION IF EXISTS public.get_next_research_slot();

-- Clean up obsolete system configs
DELETE FROM public.system_config 
WHERE config_key IN ('research_queue_max_concurrent', 'research_queue_min_spacing_seconds');

-- Update research model to use standard model instead of reasoning model
UPDATE public.system_config 
SET config_value = 'gpt-4o-mini', 
    description = 'Modelo para investigación legal'
WHERE config_key = 'research_ai_model';