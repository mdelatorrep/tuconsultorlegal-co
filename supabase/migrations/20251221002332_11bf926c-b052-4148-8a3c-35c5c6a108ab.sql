-- Add judicial_process to the tool_type constraint
ALTER TABLE legal_tools_results DROP CONSTRAINT IF EXISTS legal_tools_results_tool_type_check;
ALTER TABLE legal_tools_results ADD CONSTRAINT legal_tools_results_tool_type_check 
CHECK (tool_type IN ('research', 'analysis', 'drafting', 'strategy', 'process_query', 'judicial_process', 'suin_juriscol'));