import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();

    const {
      agentData,
      conversationBlocks,
      fieldInstructions
    } = body;

    console.log('Saving agent with blocks:', {
      agentName: agentData.name,
      blocksCount: conversationBlocks?.length || 0,
      instructionsCount: fieldInstructions?.length || 0
    });

    // Insert the legal agent
    const { data: agent, error: agentError } = await supabase
      .from('legal_agents')
      .insert(agentData)
      .select()
      .single();

    if (agentError) {
      console.error('Error creating agent:', agentError);
      throw new Error('Failed to create agent');
    }

    console.log('Agent created successfully:', agent.id);

    // Insert conversation blocks if provided
    if (conversationBlocks && conversationBlocks.length > 0) {
      const blocksToInsert = conversationBlocks.map((block: any, index: number) => ({
        legal_agent_id: agent.id,
        block_name: block.blockName,
        intro_phrase: block.introPhrase,
        placeholders: block.placeholders,
        block_order: index + 1
      }));

      const { error: blocksError } = await supabase
        .from('conversation_blocks')
        .insert(blocksToInsert);

      if (blocksError) {
        console.error('Error creating conversation blocks:', blocksError);
        // Don't fail the entire operation for this
      } else {
        console.log(`Created ${blocksToInsert.length} conversation blocks`);
      }
    }

    // Insert field instructions if provided
    if (fieldInstructions && fieldInstructions.length > 0) {
      const instructionsToInsert = fieldInstructions.map((instruction: any) => ({
        legal_agent_id: agent.id,
        field_name: instruction.fieldName,
        validation_rule: instruction.validationRule,
        help_text: instruction.helpText
      }));

      const { error: instructionsError } = await supabase
        .from('field_instructions')
        .insert(instructionsToInsert);

      if (instructionsError) {
        console.error('Error creating field instructions:', instructionsError);
        // Don't fail the entire operation for this
      } else {
        console.log(`Created ${instructionsToInsert.length} field instructions`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      agent: agent,
      message: 'Agent and conversation structure saved successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in save-agent-with-blocks:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});