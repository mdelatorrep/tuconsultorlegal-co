import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { lawyerId } = await req.json();

    if (!lawyerId) {
      throw new Error('lawyerId is required');
    }

    console.log('Getting agent drafts for lawyer:', lawyerId);

    // Get drafts with conversation blocks and field instructions
    const { data: drafts, error } = await supabase
      .from('agent_drafts')
      .select(`
        id, 
        draft_name, 
        step_completed, 
        doc_name, 
        doc_desc, 
        doc_cat,
        target_audience,
        doc_template,
        initial_prompt,
        sla_hours,
        sla_enabled,
        lawyer_suggested_price,
        ai_results,
        created_at,
        updated_at
      `)
      .eq('lawyer_id', lawyerId)
      .order('updated_at', { ascending: false })
      .limit(50); // Limit to latest 50 drafts

    if (error) {
      console.error('Error fetching drafts:', error);
      throw error;
    }

    // For each draft, get conversation blocks and field instructions
    const draftsWithBlocks = await Promise.all(
      (drafts || []).map(async (draft) => {
        const [conversationBlocks, fieldInstructions] = await Promise.all([
          supabase
            .from('agent_draft_blocks')
            .select('*')
            .eq('agent_draft_id', draft.id)
            .order('block_order'),
          supabase
            .from('agent_draft_field_instructions')
            .select('*')
            .eq('agent_draft_id', draft.id)
        ]);

        return {
          ...draft,
          conversation_blocks: conversationBlocks.data || [],
          field_instructions: fieldInstructions.data || []
        };
      })
    );

    console.log(`Found ${draftsWithBlocks?.length || 0} drafts with blocks`);

    return new Response(JSON.stringify({
      success: true,
      drafts: draftsWithBlocks || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-agent-drafts function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Error interno del servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});