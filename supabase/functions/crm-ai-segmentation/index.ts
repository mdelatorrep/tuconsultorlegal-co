import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const { lawyer_id } = await req.json();

    if (!lawyer_id) {
      return new Response(
        JSON.stringify({ error: 'lawyer_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch clients data
    const { data: clients, error: clientsError } = await supabase
      .from('crm_clients')
      .select(`
        *,
        cases:crm_cases(count),
        communications:crm_communications(count)
      `)
      .eq('lawyer_id', lawyer_id);

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch clients data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!clients || clients.length === 0) {
      return new Response(
        JSON.stringify({ segments_created: 0, message: 'No clients found for segmentation' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare data for AI analysis
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

    // Call OpenAI for AI-powered segmentation
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en análisis de datos y segmentación de clientes para un despacho legal. 
            Analiza los datos de clientes y crea segmentos útiles basados en patrones que identifiques.
            
            Criterios importantes:
            - Tipo de cliente (individual vs empresa)
            - Nivel de actividad (casos y comunicaciones)
            - Antigüedad del cliente
            - Estado del cliente
            - Cualquier patrón en las etiquetas o nombres de empresa
            
            Devuelve SOLO un JSON válido con este formato:
            {
              "segments": [
                {
                  "name": "Nombre del Segmento",
                  "description": "Descripción clara del segmento",
                  "criteria": {
                    "client_type": "individual|company|null",
                    "status": "active|inactive|prospect|null",
                    "min_cases": 0,
                    "max_cases": 999,
                    "min_communications": 0,
                    "max_communications": 999,
                    "company_keywords": ["palabra1", "palabra2"],
                    "tags_include": ["tag1", "tag2"]
                  }
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `Analiza estos datos de clientes y crea segmentos útiles:
            ${JSON.stringify(clientsData, null, 2)}`
          }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to generate AI segmentation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await openaiResponse.json();
    const segmentationResult = aiResponse.choices[0].message.content;

    let segments;
    try {
      segments = JSON.parse(segmentationResult);
    } catch (error) {
      console.error('Failed to parse AI response:', segmentationResult);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save segments to database
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

      if (!insertError) {
        segmentsCreated++;
      } else {
        console.error('Error inserting segment:', insertError);
      }
    }

    console.log(`Successfully created ${segmentsCreated} AI-generated segments for lawyer ${lawyer_id}`);

    return new Response(
      JSON.stringify({ 
        segments_created: segmentsCreated,
        segments: segments.segments || []
      }),
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