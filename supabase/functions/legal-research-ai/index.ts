import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get system configuration
async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle();

    if (error || !data) {
      return defaultValue || '';
    }

    return data.config_value;
  } catch (error) {
    console.error(`Exception fetching config ${configKey}:`, error);
    return defaultValue || '';
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Legal research function called - using intelligent queue system');
    
    // Get authentication header and verify user
    const authHeader = req.headers.get('authorization');
    let lawyerId = null;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (authHeader) {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabaseClient = createClient(supabaseUrl, anonKey);
      
      const token = authHeader.replace('Bearer ', '');
      const { data: userData } = await supabaseClient.auth.getUser(token);
      lawyerId = userData.user?.id;
    }
    
    const { query, priority = 0 } = await req.json();
    console.log('Received query:', query);

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!lawyerId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if lawyer already has too many pending research tasks
    const { data: pendingCount, error: countError } = await supabase
      .from('research_queue')
      .select('id', { count: 'exact' })
      .eq('lawyer_id', lawyerId)
      .in('status', ['pending', 'processing', 'rate_limited']);

    if (countError) {
      console.error('Error checking pending count:', countError);
    }

    const maxPendingPerLawyer = 5;
    if (pendingCount && pendingCount.length >= maxPendingPerLawyer) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Ya tienes ${maxPendingPerLawyer} investigaciones en cola. Espera a que se completen antes de agregar más.` 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Add to research queue using the database function
    const { data: queueId, error: queueError } = await supabase
      .rpc('add_to_research_queue', {
        p_lawyer_id: lawyerId,
        p_query: query,
        p_priority: priority
      });

    if (queueError) {
      console.error('Error adding to queue:', queueError);
      throw new Error(`Failed to queue research: ${queueError.message}`);
    }

    console.log(`✅ Research queued with ID: ${queueId}`);

    // Get queue position and estimated time
    const { data: queuePosition } = await supabase
      .from('research_queue')
      .select('id')
      .in('status', ['pending', 'processing', 'rate_limited'])
      .order('created_at', { ascending: true });

    const position = queuePosition?.findIndex(q => q.id === queueId) ?? 0;
    const minSpacing = parseInt(await getSystemConfig(supabase, 'research_queue_min_spacing_seconds', '180'));
    const estimatedMinutes = Math.ceil((position * minSpacing) / 60) + 5; // +5 min for processing

    // Trigger queue processing (fire and forget)
    EdgeRuntime.waitUntil(
      fetch(`${supabaseUrl}/functions/v1/process-research-queue`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ trigger: 'new_item' })
      }).catch(err => console.log('Queue processor trigger error (non-fatal):', err))
    );

    return new Response(
      JSON.stringify({
        success: true,
        queue_id: queueId,
        position: position + 1,
        estimated_time: `${estimatedMinutes}-${estimatedMinutes + 25} minutos`,
        message: `Tu investigación ha sido agregada a la cola. Posición: ${position + 1}. Tiempo estimado: ${estimatedMinutes}-${estimatedMinutes + 25} minutos.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in legal-research-ai:', error);
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
