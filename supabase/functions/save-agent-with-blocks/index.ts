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
      lawyerId,
      draftId,
      draftName,
      stepCompleted,
      agentData,
      conversationBlocks,
      fieldInstructions
    } = body;

    console.log('Saving agent with blocks:', {
      lawyerId,
      draftId,
      draftName,
      stepCompleted,
      agentName: agentData?.doc_name,
      blocksCount: conversationBlocks?.length || 0,
      instructionsCount: fieldInstructions?.length || 0
    });

    let agentDraftId = draftId;

    // If no draftId provided, create new draft or update existing one
    if (!agentDraftId) {
      const { data: existingDraft, error: findError } = await supabase
        .from('agent_drafts')
        .select('id')
        .eq('lawyer_id', lawyerId)
        .eq('draft_name', draftName)
        .maybeSingle();

      if (findError && findError.code !== 'PGRST116') {
        console.error('Error finding existing draft:', findError);
        throw new Error('Failed to check for existing draft');
      }

      agentDraftId = existingDraft?.id;
    }

    // Update or insert the agent draft
    let agent;
    if (agentDraftId) {
      // Update existing draft
      const { data: updatedAgent, error: updateError } = await supabase
        .from('agent_drafts')
        .update({
          ...agentData,
          step_completed: stepCompleted,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentDraftId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating agent draft:', updateError);
        throw new Error('Failed to update agent draft');
      }
      agent = updatedAgent;
    } else {
      // Create new draft
      const { data: newAgent, error: createError } = await supabase
        .from('agent_drafts')
        .insert({
          lawyer_id: lawyerId,
          draft_name: draftName,
          step_completed: stepCompleted,
          ...agentData
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating agent draft:', createError);
        throw new Error('Failed to create agent draft');
      }
      agent = newAgent;
      agentDraftId = agent.id;
    }

    console.log('Agent draft saved successfully:', agentDraftId);

    // Handle conversation blocks
    if (conversationBlocks) {
      // First, delete existing blocks for this agent
      const { error: deleteBlocksError } = await supabase
        .from('conversation_blocks')
        .delete()
        .eq('legal_agent_id', agentDraftId);

      if (deleteBlocksError) {
        console.error('Error deleting existing conversation blocks:', deleteBlocksError);
      }

      if (conversationBlocks.length > 0) {
        // Insert new conversation blocks
        const blocksToInsert = conversationBlocks.map((block: any, index: number) => ({
          legal_agent_id: agentDraftId,
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
        } else {
          console.log(`Created ${blocksToInsert.length} conversation blocks`);
        }
      } else {
        console.log('No conversation blocks provided; existing blocks cleared.');
      }
    }

    // Handle field instructions
    if (fieldInstructions) {
      // First, delete existing instructions for this agent
      const { error: deleteInstructionsError } = await supabase
        .from('field_instructions')
        .delete()
        .eq('legal_agent_id', agentDraftId);

      if (deleteInstructionsError) {
        console.error('Error deleting existing field instructions:', deleteInstructionsError);
      }

      if (fieldInstructions.length > 0) {
        // Insert new field instructions
        const instructionsToInsert = fieldInstructions.map((instruction: any) => ({
          legal_agent_id: agentDraftId,
          field_name: instruction.fieldName,
          validation_rule: instruction.validationRule,
          help_text: instruction.helpText
        }));

        const { error: instructionsError } = await supabase
          .from('field_instructions')
          .insert(instructionsToInsert);

        if (instructionsError) {
          console.error('Error creating field instructions:', instructionsError);
        } else {
          console.log(`Created ${instructionsToInsert.length} field instructions`);
        }
      } else {
        console.log('No field instructions provided; existing instructions cleared.');
      }
    }

    return new Response(JSON.stringify({
      success: true,
      agent: agent,
      draftId: agentDraftId,
      message: 'Agent draft and conversation structure saved successfully'
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