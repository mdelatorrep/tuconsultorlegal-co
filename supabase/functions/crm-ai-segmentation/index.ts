import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { 
  buildResponsesRequestParams, 
  callResponsesAPI, 
  logResponsesRequest 
} from "../_shared/openai-responses-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get required system configuration - throws if not found
async function getRequiredConfig(supabaseClient: any, configKey: string): Promise<string> {
  const { data, error } = await supabaseClient
    .from('system_config')
    .select('config_value')
    .eq('config_key', configKey)
    .maybeSingle();

  if (error || !data?.config_value) {
    throw new Error(`Configuración '${configKey}' no encontrada en system_config. Por favor configúrela en el panel de administración.`);
  }

  return data.config_value;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lawyer_id } = await req.json();

    if (!lawyer_id) {
      return new Response(
        JSON.stringify({ error: 'lawyer_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get model and prompt from system config - NO FALLBACKS
    const [model, systemPrompt] = await Promise.all([
      getRequiredConfig(supabase, 'crm_segmentation_ai_model'),
      getRequiredConfig(supabase, 'crm_segmentation_prompt')
    ]);
    
    logResponsesRequest(model, 'crm-ai-segmentation', true);

    const { data: clients, error: clientsError } = await supabase
      .from('crm_clients')
      .select(`*, cases:crm_cases(count), communications:crm_communications(count)`)
      .eq('lawyer_id', lawyer_id);

    if (clientsError || !clients || clients.length === 0) {
      return new Response(
        JSON.stringify({ segments_created: 0, message: 'No clients found for segmentation' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientsData = clients.map(client => ({
      id: client.id,
      name: client.name,
      client_type: client.client_type,
      status: client.status,
      company: client.company,
      tags: client.tags,
      cases_count: client.cases?.[0]?.count || 0,
      communications_count: client.communications?.[0]?.count || 0,
      created_at: client.created_at
    }));

    const instructions = systemPrompt;

    const input = `Analiza estos datos de clientes y crea segmentos útiles. Responde ÚNICAMENTE en formato JSON:\n${JSON.stringify(clientsData, null, 2)}`;

    const params = buildResponsesRequestParams(model, {
      input,
      instructions,
      maxOutputTokens: 4000,
      temperature: 0.3,
      jsonMode: true,
      store: false,
      reasoning: { effort: 'low' }
    });

    const result = await callResponsesAPI(openaiApiKey, params);

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate AI segmentation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const segments = JSON.parse(result.text || '{"segments": []}');

    let segmentsCreated = 0;
    for (const segment of segments.segments || []) {
      const { error: insertError } = await supabase
        .from('crm_client_segments')
        .insert({
          lawyer_id,
          name: segment.name,
          description: segment.description,
          criteria: segment.criteria,
          ai_generated: true,
          is_active: true
        });
      if (!insertError) segmentsCreated++;
    }

    console.log('✅ CRM segmentation completed:', segmentsCreated, 'segments created');

    return new Response(
      JSON.stringify({ segments_created: segmentsCreated, segments: segments.segments || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in CRM AI segmentation:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
