import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Rama Judicial API endpoints ───────────────────────────────────────────
// Official public API used by consultaprocesos.ramajudicial.gov.co
const RAMA_BASE = 'https://consultaprocesos.ramajudicial.gov.co:448/api/v2';

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; LegalQuery/1.0)',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Rama Judicial API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// Search by radicado (process number)
async function searchByRadicado(radicado: string) {
  const clean = radicado.replace(/\s/g, '');
  const url = `${RAMA_BASE}/Proceso/Consulta/NumeroRadicacion?numero=${encodeURIComponent(clean)}&SoloActivos=false&pagina=1`;
  console.log(`[rama-api] GET ${url}`);
  return fetchJson(url);
}

// Search by identification document (cedula/NIT)
async function searchByDocument(documentNumber: string, documentType: string = 'CC') {
  const clean = documentNumber.replace(/\s/g, '');
  const url = `${RAMA_BASE}/Proceso/Consulta/NombreRazonSocial?nombre=${encodeURIComponent(clean)}&tipoPersona=jur%C3%ADdica&SoloActivos=false&pagina=1`;
  // Try cedula-based search  
  const cedulaUrl = `${RAMA_BASE}/Proceso/Consulta/NumeroIdentificacion?tipoIdentificacion=${documentType}&identificacion=${encodeURIComponent(clean)}&SoloActivos=false&pagina=1`;
  console.log(`[rama-api] GET ${cedulaUrl}`);
  return fetchJson(cedulaUrl);
}

// Get process actuaciones (proceedings detail)
async function getProcessActuaciones(idProceso: string) {
  const url = `${RAMA_BASE}/Proceso/Actuaciones/${encodeURIComponent(idProceso)}`;
  console.log(`[rama-api] GET ${url}`);
  try {
    return await fetchJson(url);
  } catch (e) {
    console.warn('[rama-api] No actuaciones:', e.message);
    return null;
  }
}

// Get process sujetos (parties)
async function getProcessSujetos(idProceso: string) {
  const url = `${RAMA_BASE}/Proceso/Sujetos/${encodeURIComponent(idProceso)}`;
  console.log(`[rama-api] GET ${url}`);
  try {
    return await fetchJson(url);
  } catch (e) {
    console.warn('[rama-api] No sujetos:', e.message);
    return null;
  }
}

// Normalize process data from the API response
function normalizeProcess(p: any) {
  return {
    idProceso: p.idProceso || p.llaveProceso,
    llaveProceso: p.llaveProceso || p.idProceso,
    fechaRadicacion: p.fechaProceso || p.fechaRadicacion,
    fechaUltimaActuacion: p.fechaUltimaActuacion,
    despacho: p.despacho,
    departamento: p.departamento,
    tipoProceso: p.tipoProceso,
    claseProceso: p.claseProceso,
    subclaseProceso: p.subclaseProceso,
    ponente: p.ponente,
    ubicacion: p.ubicacion || p.departamento,
    esPrivado: p.esPrivado || false,
    cantFilas: p.cantFilas,
    sujetos: (p.sujetos || []).map((s: any) => ({
      nombre: s.nombre,
      tipoSujeto: s.tipoSujeto,
      representante: s.representante || '',
    })),
    actuaciones: (p.actuaciones || []).map((a: any) => ({
      fechaActuacion: a.fechaActuacion,
      actuacion: a.actuacion || a.nombre,
      anotacion: a.anotacion,
      fechaInicia: a.fechaInicia,
      fechaFinaliza: a.fechaFinaliza,
      fechaRegistro: a.fechaRegistro,
    })),
  };
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

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData = await req.json();
    const { queryType, radicado, documentNumber, documentType, followUpQuery, conversationHistory } = requestData;

    console.log('[judicial-process-lookup] Query:', { queryType, radicado, documentNumber, documentType });

    // ── Step 1: Query the official Rama Judicial API ──────────────────────
    let apiResponse: any = null;
    let processes: any[] = [];
    let rawProcesses: any[] = [];

    if (queryType === 'radicado' && radicado) {
      apiResponse = await searchByRadicado(radicado);
    } else if (queryType === 'document' && documentNumber) {
      apiResponse = await searchByDocument(documentNumber, documentType || 'CC');
    } else if (radicado) {
      // Fallback: if radicado is provided regardless of queryType
      apiResponse = await searchByRadicado(radicado);
    } else {
      return new Response(
        JSON.stringify({ error: 'Debe especificar un número de radicado o documento' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[judicial-process-lookup] API response keys:', Object.keys(apiResponse || {}));

    // ── Step 2: Parse the API response ───────────────────────────────────
    // The Rama Judicial API returns { procesos: [...], cantidadRegistros: N }
    if (apiResponse?.procesos && Array.isArray(apiResponse.procesos)) {
      rawProcesses = apiResponse.procesos;
    } else if (Array.isArray(apiResponse)) {
      rawProcesses = apiResponse;
    } else if (apiResponse?.proceso) {
      rawProcesses = [apiResponse.proceso];
    }

    console.log(`[judicial-process-lookup] Found ${rawProcesses.length} processes`);

    // ── Step 3: For each process, enrich with sujetos and actuaciones ─────
    // Limit to first 5 to avoid timeouts
    const enrichmentPromises = rawProcesses.slice(0, 5).map(async (p: any) => {
      const idProceso = p.idProceso || p.llaveProceso;
      if (!idProceso) return normalizeProcess(p);

      const [sujetosData, actuacionesData] = await Promise.allSettled([
        getProcessSujetos(idProceso),
        getProcessActuaciones(idProceso),
      ]);

      const enriched = { ...p };
      
      if (sujetosData.status === 'fulfilled' && sujetosData.value) {
        const suj = sujetosData.value;
        enriched.sujetos = Array.isArray(suj) ? suj : (suj.sujetos || suj.partes || []);
      }
      
      if (actuacionesData.status === 'fulfilled' && actuacionesData.value) {
        const act = actuacionesData.value;
        enriched.actuaciones = Array.isArray(act) ? act : (act.actuaciones || act.actuacion || []);
        if (enriched.actuaciones.length > 0) {
          enriched.fechaUltimaActuacion = enriched.actuaciones[0].fechaActuacion || enriched.fechaUltimaActuacion;
        }
      }

      return normalizeProcess(enriched);
    });

    processes = await Promise.all(enrichmentPromises);

    // ── Step 4: AI analysis ───────────────────────────────────────────────
    let aiAnalysis: string | null = null;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (OPENAI_API_KEY) {
      try {
        const { data: modelConfig } = await serviceClient
          .from('system_config')
          .select('config_value')
          .eq('config_key', 'process_query_ai_model')
          .maybeSingle();
        
        const { data: promptConfig } = await serviceClient
          .from('system_config')
          .select('config_value')
          .eq('config_key', 'process_query_ai_prompt')
          .maybeSingle();

        const aiModel = modelConfig?.config_value || 'gpt-4o-mini';
        const systemPrompt = promptConfig?.config_value || 
          'Eres un asistente legal especializado en derecho colombiano. Analiza procesos judiciales de la Rama Judicial y proporciona análisis claros y útiles para abogados.';

        let userContent: string;

        if (followUpQuery && conversationHistory) {
          userContent = `Contexto del proceso:\n${JSON.stringify(processes[0] || {}, null, 2)}\n\nPregunta: ${followUpQuery}`;
        } else if (processes.length > 0) {
          const processToAnalyze = processes[0];
          userContent = `Analiza este proceso judicial colombiano y proporciona un resumen ejecutivo para el abogado:\n\n${JSON.stringify(processToAnalyze, null, 2)}`;
        } else {
          userContent = `No se encontraron procesos judiciales con los criterios de búsqueda proporcionados (${queryType}: ${radicado || documentNumber}).`;
        }

        const messages: any[] = [
          { role: 'system', content: systemPrompt },
        ];

        if (conversationHistory && Array.isArray(conversationHistory)) {
          messages.push(...conversationHistory);
        }

        messages.push({ role: 'user', content: userContent });

        const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: aiModel,
            messages,
            max_tokens: 2000,
          }),
        });

        const aiData = await aiResp.json();
        aiAnalysis = aiData.choices?.[0]?.message?.content || null;
      } catch (aiErr) {
        console.error('[judicial-process-lookup] AI error:', aiErr);
      }
    }

    // ── Step 5: Save result ───────────────────────────────────────────────
    try {
      await serviceClient.from('legal_tools_results').insert({
        lawyer_id: user.id,
        tool_type: 'judicial_process',
        input_data: { queryType, radicado, documentNumber, documentType, followUpQuery },
        output_data: {
          processes,
          processDetails: processes[0] || null,
          aiAnalysis,
          processCount: processes.length,
        },
        metadata: {
          source: 'rama_judicial_api_v2',
          portal: 'consultaprocesos.ramajudicial.gov.co',
          timestamp: new Date().toISOString(),
          rawCount: rawProcesses.length,
        }
      });
    } catch (saveErr) {
      console.error('[judicial-process-lookup] Save error:', saveErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processes,
        processDetails: processes[0] || null,
        processCount: processes.length,
        aiAnalysis,
        queryType,
        source: 'rama_judicial_api_v2',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[judicial-process-lookup] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        details: 'Error al consultar el sistema de la Rama Judicial. Verifique el número ingresado e intente nuevamente.',
        processes: [],
        processCount: 0,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
