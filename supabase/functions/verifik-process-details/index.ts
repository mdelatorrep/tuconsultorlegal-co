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
    const { processNumber } = requestData;

    if (!processNumber) {
      return new Response(
        JSON.stringify({ error: 'processNumber is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verifik-process-details] Getting details for:', processNumber);

    // Service client for database operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call Verifik API - GET /v2/co/rama/proceso/{processNumber}
    // Documentation: https://docs.verifik.co/legal/retrieve-details-of-a-legal-process-by-number/
    const endpoint = `${VERIFIK_BASE_URL}/co/rama/proceso/${encodeURIComponent(processNumber)}`;
    console.log('[verifik-process-details] Calling Verifik:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERIFIK_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    const verifik_response = await response.json();
    console.log('[verifik-process-details] Verifik response status:', response.status);

    const apiCost = 0.15; // Track API cost

    // Log API usage
    await serviceClient.from('verifik_api_usage').insert({
      lawyer_id: user.id,
      endpoint: '/v2/co/rama/proceso',
      request_params: { processNumber },
      response_status: response.status,
      response_data: { hasData: !!verifik_response.data },
      api_cost: apiCost,
    });

    let processData = null;

    if (response.ok && verifik_response.data) {
      const data = verifik_response.data;
      
      // Map response fields according to Verifik documentation
      processData = {
        idProceso: data.idProceso,
        llaveProceso: data.llaveProceso || processNumber,
        fechaProceso: data.fechaProceso,
        fechaUltimaActuacion: data.fechaUltimaActuacion,
        despacho: data.despacho,
        departamento: data.departamento,
        tipoProceso: data.tipoProceso,
        claseProceso: data.claseProceso,
        subclaseProceso: data.subclaseProceso,
        recurso: data.recurso,
        ubicacion: data.ubicacion,
        ponente: data.ponente,
        esPrivado: data.esPrivado,
        cantFilas: data.cantFilas,
        
        // Detailed information
        sujetosProcesales: (data.sujetosProcesales || data.sujetos || []).map((s: any) => ({
          nombre: s.nombre,
          tipoSujeto: s.tipoSujeto || s.tipo,
          representante: s.representante,
        })),
        
        actuaciones: (data.actuaciones || []).map((a: any) => ({
          fechaActuacion: a.fechaActuacion,
          actuacion: a.actuacion || a.nombre,
          anotacion: a.anotacion,
          fechaInicia: a.fechaInicia,
          fechaFinaliza: a.fechaFinaliza,
          fechaRegistro: a.fechaRegistro,
          consSecuencia: a.consSecuencia,
          existeDocs: a.existeDocs,
        })),
      };
    }

    // Save to legal_tools_results
    await serviceClient.from('legal_tools_results').insert({
      lawyer_id: user.id,
      tool_type: 'process_details',
      input_data: { processNumber },
      output_data: { 
        process: processData,
        hasData: !!processData,
      },
      metadata: { 
        source: 'verifik',
        endpoint: '/v2/co/rama/proceso',
        apiCost,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({
        success: !!processData,
        process: processData,
        message: processData 
          ? 'Detalles del proceso obtenidos exitosamente' 
          : 'No se encontró el proceso',
        rawResponse: verifik_response,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verifik-process-details] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Error getting process details'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});