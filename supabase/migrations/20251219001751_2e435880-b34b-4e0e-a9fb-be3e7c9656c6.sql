-- Update the check constraint to include suin_juriscol tool type
ALTER TABLE public.legal_tools_results
DROP CONSTRAINT IF EXISTS legal_tools_results_tool_type_check;

ALTER TABLE public.legal_tools_results
ADD CONSTRAINT legal_tools_results_tool_type_check 
CHECK (tool_type = ANY (ARRAY['research'::text, 'analysis'::text, 'draft'::text, 'integration'::text, 'suin_juriscol'::text]));