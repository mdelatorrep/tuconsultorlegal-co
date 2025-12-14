import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildOpenAIRequestParams, logModelRequest } from "../_shared/openai-model-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const model = 'gpt-4o-mini';
    logModelRequest(model, 'crm-ai-segmentation');

    const messages = [
      {
        role: 'system',
        content: `Eres un experto en análisis de datos y segmentación de clientes para un despacho legal. Analiza los datos y crea segmentos útiles. Devuelve SOLO JSON válido con formato: {"segments": [{"name": "...", "description": "...", "criteria": {...}}]}`
      },
      {
        role: 'user',
        content: `Analiza estos datos de clientes y crea segmentos útiles:\n${JSON.stringify(clientsData, null, 2)}`
      }
    ];

    const requestParams = buildOpenAIRequestParams(model, messages, {
      maxTokens: 2000,
      temperature: 0.3
    });

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestParams),
    });

    if (!openaiResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate AI segmentation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await openaiResponse.json();
    const segments = JSON.parse(aiResponse.choices[0].message.content);

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

    return new Response(
      JSON.stringify({ segments_created: segmentsCreated, segments: segments.segments || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in CRM AI segmentation:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
