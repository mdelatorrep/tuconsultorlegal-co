import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERIFIK_BASE_URL = 'https://api.verifik.co/v2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const VERIFIK_API_KEY = Deno.env.get('VERIFIK_API_KEY');
    if (!VERIFIK_API_KEY) {
      console.error('VERIFIK_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Verifik API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData = await req.json();
    const { queryType, documentNumber, documentType, radicado, name, followUpQuery, conversationHistory } = requestData;

    console.log('[judicial-process-lookup] Query:', { queryType, documentNumber, radicado, name });

    let verifik_response = null;
    let processes: any[] = [];

    // Call Verifik API based on query type
    if (queryType === 'document' && documentNumber) {
      // Query by document number (CC, NIT, CE, etc.)
      const endpoint = `${VERIFIK_BASE_URL}/co/consultaprocesos/numero-documento`;
      console.log('[judicial-process-lookup] Calling Verifik by document:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERIFIK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentType: documentType || 'CC',
          documentNumber: documentNumber,
        }),
      });

      verifik_response = await response.json();
      console.log('[judicial-process-lookup] Verifik response status:', response.status);

      if (response.ok && verifik_response.data) {
        processes = verifik_response.data.procesos || [];
      }

    } else if (queryType === 'radicado' && radicado) {
      // Query by radicado number
      const endpoint = `${VERIFIK_BASE_URL}/co/consultaprocesos/numero-radicacion`;
      console.log('[judicial-process-lookup] Calling Verifik by radicado:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERIFIK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          radicado: radicado,
        }),
      });

      verifik_response = await response.json();
      console.log('[judicial-process-lookup] Verifik response status:', response.status);

      if (response.ok && verifik_response.data) {
        processes = verifik_response.data.procesos ? [verifik_response.data] : [verifik_response.data];
      }

    } else if (queryType === 'name' && name) {
      // Query by name
      const endpoint = `${VERIFIK_BASE_URL}/co/consultaprocesos/nombre`;
      console.log('[judicial-process-lookup] Calling Verifik by name:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERIFIK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
        }),
      });

      verifik_response = await response.json();
      console.log('[judicial-process-lookup] Verifik response status:', response.status);

      if (response.ok && verifik_response.data) {
        processes = verifik_response.data.procesos || [];
      }
    }

    // If it's a follow-up query, use AI to analyze
    let aiAnalysis = null;
    if (followUpQuery && processes.length > 0) {
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (OPENAI_API_KEY) {
        const systemPrompt = `Eres un asistente legal experto en procesos judiciales colombianos. 
Analiza los datos del proceso judicial proporcionado y responde las preguntas del usuario de manera clara y concisa.
Proporciona información práctica sobre tiempos, próximos pasos, y recomendaciones legales.`;

        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Datos del proceso:\n${JSON.stringify(processes, null, 2)}\n\nPregunta: ${followUpQuery}` }
        ];

        if (conversationHistory) {
          messages.push(...conversationHistory);
        }

        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
            max_tokens: 1000,
          }),
        });

        const aiData = await aiResponse.json();
        aiAnalysis = aiData.choices?.[0]?.message?.content;
      }
    }

    // Generate initial AI analysis if this is a new query
    if (!followUpQuery && processes.length > 0) {
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (OPENAI_API_KEY) {
        const systemPrompt = `Eres un asistente legal experto en procesos judiciales colombianos.
Analiza los datos del proceso judicial y proporciona:
1. Un resumen ejecutivo del estado actual
2. Las últimas actuaciones importantes
3. Posibles próximos pasos según el tipo de proceso
4. Alertas sobre plazos o términos que puedan estar corriendo

Sé conciso pero completo.`;

        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Analiza este proceso judicial:\n${JSON.stringify(processes, null, 2)}` }
            ],
            max_tokens: 1500,
          }),
        });

        const aiData = await aiResponse.json();
        aiAnalysis = aiData.choices?.[0]?.message?.content;
      }
    }

    // Save query to legal_tools_results
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await serviceClient.from('legal_tools_results').insert({
      lawyer_id: user.id,
      tool_type: 'judicial_process',
      input_data: { queryType, documentNumber, documentType, radicado, name },
      output_data: { 
        processes, 
        aiAnalysis,
        processCount: processes.length 
      },
      metadata: { 
        source: 'verifik',
        timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        processes,
        processCount: processes.length,
        aiAnalysis,
        rawResponse: verifik_response,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[judicial-process-lookup] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Error processing judicial process lookup'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});