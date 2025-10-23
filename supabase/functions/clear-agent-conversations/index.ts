import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { agentId } = await req.json();

    console.log('🧹 Clearing agent conversations:', { agentId: agentId || 'ALL' });

    let deleteQuery = supabase.from('agent_conversations').delete();
    
    // Si se proporciona un agentId específico, solo borrar ese agente
    if (agentId) {
      // Obtener el openai_agent_id desde legal_agents
      const { data: agent } = await supabase
        .from('openai_agents')
        .select('id')
        .eq('legal_agent_id', agentId)
        .single();
      
      if (agent) {
        deleteQuery = deleteQuery.eq('openai_agent_id', agent.id);
      } else {
        throw new Error('Agent not found');
      }
    } else {
      // Si no se proporciona agentId, borrar todas las conversaciones (usar neq para borrar todo)
      deleteQuery = deleteQuery.neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { error: deleteError, count } = await deleteQuery;

    if (deleteError) {
      console.error('Error deleting conversations:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Deleted ${count || 0} agent conversations`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount: count || 0,
        message: agentId 
          ? `Se limpiaron ${count || 0} conversaciones del agente` 
          : `Se limpiaron ${count || 0} conversaciones de todos los agentes`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in clear-agent-conversations:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
