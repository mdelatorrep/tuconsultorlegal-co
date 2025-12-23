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

    // Service client for logging
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let verifik_response = null;
    let processes: any[] = [];
    let apiCost = 0;

    // Call Verifik API based on query type - CORRECTED ENDPOINTS PER DOCUMENTATION
    if (queryType === 'document' && documentNumber) {
      // Query by document number - GET /v2/co/rama/procesos
      // Documentation: https://docs.verifik.co/legal/colombian-legal-processes/
      const params = new URLSearchParams({
        documentType: documentType || 'CC',
        documentNumber: documentNumber,
      });
      
      const endpoint = `${VERIFIK_BASE_URL}/co/rama/procesos?${params.toString()}`;
      console.log('[judicial-process-lookup] Calling Verifik by document:', endpoint);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VERIFIK_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      verifik_response = await response.json();
      console.log('[judicial-process-lookup] Verifik response status:', response.status);
      apiCost = 0.10; // Track API cost

      if (response.ok && verifik_response.data) {
        // Map response fields according to Verifik documentation
        const rawProcesses = verifik_response.data.procesos || verifik_response.data || [];
        processes = Array.isArray(rawProcesses) ? rawProcesses.map((p: any) => ({
          idProceso: p.idProceso,
          llaveProceso: p.llaveProceso,
          fechaProceso: p.fechaProceso,
          fechaUltimaActuacion: p.fechaUltimaActuacion,
          despacho: p.despacho,
          departamento: p.departamento,
          tipoProceso: p.tipoProceso,
          claseProceso: p.claseProceso,
          subclaseProceso: p.subclaseProceso,
          recurso: p.recurso,
          ubicacion: p.ubicacion,
          ponente: p.ponente,
          sujetosProcesales: p.sujetosProcesales || [],
          esPrivado: p.esPrivado,
          cantFilas: p.cantFilas,
        })) : [];
      }

    } else if (queryType === 'radicado' && radicado) {
      // Query by radicado number - GET /v2/co/rama/proceso/{processNumber}
      // Documentation: https://docs.verifik.co/legal/retrieve-details-of-a-legal-process-by-number/
      const endpoint = `${VERIFIK_BASE_URL}/co/rama/proceso/${encodeURIComponent(radicado)}`;
      console.log('[judicial-process-lookup] Calling Verifik by radicado:', endpoint);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VERIFIK_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      verifik_response = await response.json();
      console.log('[judicial-process-lookup] Verifik response status:', response.status);
      apiCost = 0.15; // Detail query costs more

      if (response.ok && verifik_response.data) {
        const p = verifik_response.data;
        processes = [{
          idProceso: p.idProceso,
          llaveProceso: p.llaveProceso || radicado,
          fechaProceso: p.fechaProceso,
          fechaUltimaActuacion: p.fechaUltimaActuacion,
          despacho: p.despacho,
          departamento: p.departamento,
          tipoProceso: p.tipoProceso,
          claseProceso: p.claseProceso,
          subclaseProceso: p.subclaseProceso,
          recurso: p.recurso,
          ubicacion: p.ubicacion,
          ponente: p.ponente,
          sujetosProcesales: p.sujetosProcesales || p.sujetos || [],
          actuaciones: p.actuaciones || [],
          esPrivado: p.esPrivado,
          cantFilas: p.cantFilas,
        }];
      }

    } else if (queryType === 'name' && name) {
      // Query by name - GET /v2/co/rama/procesos with name parameter
      const params = new URLSearchParams({
        name: name,
      });
      
      const endpoint = `${VERIFIK_BASE_URL}/co/rama/procesos?${params.toString()}`;
      console.log('[judicial-process-lookup] Calling Verifik by name:', endpoint);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VERIFIK_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      verifik_response = await response.json();
      console.log('[judicial-process-lookup] Verifik response status:', response.status);
      apiCost = 0.10;

      if (response.ok && verifik_response.data) {
        const rawProcesses = verifik_response.data.procesos || verifik_response.data || [];
        processes = Array.isArray(rawProcesses) ? rawProcesses.map((p: any) => ({
          idProceso: p.idProceso,
          llaveProceso: p.llaveProceso,
          fechaProceso: p.fechaProceso,
          fechaUltimaActuacion: p.fechaUltimaActuacion,
          despacho: p.despacho,
          departamento: p.departamento,
          tipoProceso: p.tipoProceso,
          claseProceso: p.claseProceso,
          subclaseProceso: p.subclaseProceso,
          sujetosProcesales: p.sujetosProcesales || [],
        })) : [];
      }
    }

    // Log API usage
    await serviceClient.from('verifik_api_usage').insert({
      lawyer_id: user.id,
      endpoint: queryType === 'radicado' ? '/v2/co/rama/proceso' : '/v2/co/rama/procesos',
      request_params: { queryType, documentNumber, documentType, radicado, name },
      response_status: verifik_response ? 200 : 500,
      response_data: { processCount: processes.length },
      api_cost: apiCost,
    });

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
        endpoint: queryType === 'radicado' ? '/v2/co/rama/proceso' : '/v2/co/rama/procesos',
        apiCost,
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