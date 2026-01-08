import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERIFIK_BASE_URL = 'https://api.verifik.co/v2';

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
    const { queryType, documentNumber, documentType, idProceso, radicado, followUpQuery, conversationHistory } = requestData;

    console.log('[judicial-process-lookup] Query:', { queryType, documentNumber, idProceso, radicado });

    // Service client for logging
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let verifik_response = null;
    let processes: any[] = [];
    let processDetails: any = null;
    let apiCost = 0;

    // Call Verifik API based on query type
    if (queryType === 'document' && documentNumber) {
      // Query by document number - GET /v2/co/rama/procesos
      // Documentation: https://docs.verifik.co/docs-es/legal/procesos-legales-colombianos/
      // Required params: documentType (CC, NIT ONLY), documentNumber
      
      // Validate documentType - Verifik only accepts CC or NIT
      const validDocType = (documentType === 'CC' || documentType === 'NIT') ? documentType : 'CC';
      if (documentType && documentType !== 'CC' && documentType !== 'NIT') {
        console.warn(`[judicial-process-lookup] Invalid documentType '${documentType}', defaulting to 'CC'. Only CC and NIT are supported.`);
      }
      
      const params = new URLSearchParams({
        documentType: validDocType,
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
      apiCost = 0.10;

      if (response.ok && verifik_response.data) {
        // According to docs, response structure is: data.list (array of processes)
        const rawProcesses = verifik_response.data.list || [];
        const consultedSubject = verifik_response.data.consultedSubject || '';
        
        processes = Array.isArray(rawProcesses) ? rawProcesses.map((p: any) => {
          // sujetosProcesales can be a string (comma-separated) or array
          let sujetos: any[] = [];
          if (Array.isArray(p.sujetosProcesales)) {
            sujetos = p.sujetosProcesales.map((s: any) => ({
              nombre: s.nombreRazonSocial || s.nombre || s,
              tipoSujeto: s.tipoSujeto || '',
              representante: s.representante || '',
            }));
          } else if (typeof p.sujetosProcesales === 'string' && p.sujetosProcesales) {
            // Parse comma-separated string
            sujetos = p.sujetosProcesales.split(',').map((name: string) => ({
              nombre: name.trim(),
              tipoSujeto: '',
              representante: '',
            }));
          }
          
          return {
            idProceso: p.idProceso,
            idConexion: p.idConexion,
            llaveProceso: p.llaveProceso,
            fechaRadicacion: p.fechaProceso,
            fechaUltimaActuacion: p.fechaUltimaActuacion,
            despacho: p.despacho,
            departamento: p.departamento,
            sujetos,
            esPrivado: p.esPrivado,
            consultedSubject: consultedSubject,
          };
        }) : [];
      } else if (!response.ok) {
        console.error('[judicial-process-lookup] Verifik API error:', verifik_response);
      }

    } else if ((queryType === 'processId' && idProceso) || (queryType === 'radicado' && radicado)) {
      // Query by process ID or radicado - GET /v2/co/rama/proceso/{processNumber}
      // Documentation: https://docs.verifik.co/docs-es/legal/recuperar-detalles-proceso-legal-por-numero/
      // NOTE: Only the processNumber (numeric ID or radicado) is required, no other parameters
      const processNumber = queryType === 'radicado' ? radicado : idProceso;
      const endpoint = `${VERIFIK_BASE_URL}/co/rama/proceso/${encodeURIComponent(processNumber)}`;
      console.log('[judicial-process-lookup] Calling Verifik by processNumber:', endpoint);

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
        // According to docs, response has: data.details, data.subjects, data.actions
        const details = verifik_response.data.details || {};
        const subjects = verifik_response.data.subjects || [];
        const actions = verifik_response.data.actions || [];
        
        // Normalize subjects for frontend compatibility
        const normalizedSujetos = subjects.map((s: any) => ({
          nombre: s.nombreRazonSocial || s.nombre,
          tipoSujeto: s.tipoSujeto,
          representante: s.representante,
          identificacion: s.identificacion,
          esEmplazado: s.esEmplazado,
        }));
        
        // Normalize actuaciones for frontend compatibility
        const normalizedActuaciones = actions.map((a: any) => ({
          fechaActuacion: a.fechaActuacion,
          actuacion: a.actuacion,
          anotacion: a.anotacion,
          fechaInicia: a.fechaInicial,
          fechaFinaliza: a.fechaFinal,
          fechaRegistro: a.fechaRegistro,
        }));
        
        // Find most recent actuacion date for fechaUltimaActuacion
        const sortedActions = [...actions].sort((a, b) => 
          new Date(b.fechaActuacion || 0).getTime() - new Date(a.fechaActuacion || 0).getTime()
        );
        const fechaUltimaActuacion = sortedActions[0]?.fechaActuacion || details.ultimaActualizacion;
        
        processDetails = {
          idProceso: details.idRegProceso,
          llaveProceso: details.llaveProceso,
          idConexion: details.idConexion,
          esPrivado: details.esPrivado,
          fechaRadicacion: details.fechaProceso,
          fechaUltimaActuacion: fechaUltimaActuacion,
          despacho: details.despacho,
          departamento: details.ubicacion, // Map ubicacion to departamento
          ponente: details.ponente,
          tipoProceso: details.tipoProceso,
          claseProceso: details.claseProceso,
          subclaseProceso: details.subclaseProceso,
          recurso: details.recurso,
          ubicacion: details.ubicacion,
          contenidoRadicacion: details.contenidoRadicacion,
          sujetos: normalizedSujetos,
          actuaciones: normalizedActuaciones,
        };

        // Also add to processes array for consistency
        processes = [{
          idProceso: details.idRegProceso,
          llaveProceso: details.llaveProceso,
          fechaRadicacion: details.fechaProceso,
          fechaUltimaActuacion: fechaUltimaActuacion,
          despacho: details.despacho,
          departamento: details.ubicacion,
          tipoProceso: details.tipoProceso,
          claseProceso: details.claseProceso,
          subclaseProceso: details.subclaseProceso,
          ponente: details.ponente,
          ubicacion: details.ubicacion,
          esPrivado: details.esPrivado,
          sujetos: normalizedSujetos,
          actuaciones: normalizedActuaciones,
        }];
      } else if (!response.ok) {
        console.error('[judicial-process-lookup] Verifik API error:', verifik_response);
      }
    } else {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid query type or missing parameters',
          details: 'Use queryType="document" with documentNumber/documentType, queryType="radicado" with radicado, or queryType="processId" with idProceso'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log API usage
    try {
      await serviceClient.from('verifik_api_usage').insert({
        lawyer_id: user.id,
        endpoint: (queryType === 'processId' || queryType === 'radicado') ? '/v2/co/rama/proceso' : '/v2/co/rama/procesos',
        request_params: { queryType, documentNumber, documentType, idProceso, radicado },
        response_status: verifik_response?.code ? 400 : 200,
        response_data: { processCount: processes.length, hasDetails: !!processDetails },
        api_cost: apiCost,
      });
    } catch (logError) {
      console.error('[judicial-process-lookup] Error logging usage:', logError);
    }

    // Generate AI analysis if we have results
    let aiAnalysis = null;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (OPENAI_API_KEY && (processes.length > 0 || processDetails)) {
      try {
        // Get AI model and prompt from system config - NO FALLBACKS
        const [aiModel, systemPrompt] = await Promise.all([
          getRequiredConfig(serviceClient, 'process_query_ai_model'),
          getRequiredConfig(serviceClient, 'process_query_ai_prompt')
        ]);

        let userContent: string;
        
        if (followUpQuery) {
          // Follow-up question
          userContent = `Datos del proceso:\n${JSON.stringify(processDetails || processes, null, 2)}\n\nPregunta del usuario: ${followUpQuery}`;
        } else if (processDetails) {
          // Initial analysis for detailed process
          userContent = `Analiza este proceso judicial con sus actuaciones:\n${JSON.stringify(processDetails, null, 2)}`;
        } else {
          // Initial analysis for list of processes
          userContent = `Analiza estos procesos judiciales encontrados:\n${JSON.stringify(processes, null, 2)}`;
        }

        const messages: any[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ];

        if (conversationHistory && Array.isArray(conversationHistory)) {
          messages.push(...conversationHistory);
        }

        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: aiModel,
            messages: messages,
            max_tokens: 2000,
          }),
        });

        const aiData = await aiResponse.json();
        aiAnalysis = aiData.choices?.[0]?.message?.content;
      } catch (aiError) {
        console.error('[judicial-process-lookup] AI analysis error:', aiError);
        // Don't fail the whole request if AI fails
        aiAnalysis = `Error generando análisis: ${aiError instanceof Error ? aiError.message : 'Error desconocido'}`;
      }
    }

    // Save query to legal_tools_results
    try {
      await serviceClient.from('legal_tools_results').insert({
        lawyer_id: user.id,
        tool_type: 'judicial_process',
        input_data: { queryType, documentNumber, documentType, idProceso, radicado, followUpQuery },
        output_data: { 
          processes, 
          processDetails,
          aiAnalysis,
          processCount: processes.length 
        },
        metadata: { 
          source: 'verifik',
          endpoint: (queryType === 'processId' || queryType === 'radicado') ? '/v2/co/rama/proceso' : '/v2/co/rama/procesos',
          apiCost,
          timestamp: new Date().toISOString()
        }
      });
    } catch (saveError) {
      console.error('[judicial-process-lookup] Error saving result:', saveError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processes,
        processDetails,
        processCount: processes.length,
        aiAnalysis,
        queryType,
        // Include error info if Verifik returned an error
        verifik_error: verifik_response?.code ? {
          code: verifik_response.code,
          message: verifik_response.message
        } : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[judicial-process-lookup] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Error processing judicial process lookup'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
