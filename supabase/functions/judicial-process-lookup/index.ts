import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    throw new Error(`Configuración '${configKey}' no encontrada en system_config.`);
  }

  return data.config_value;
}

// Scrape judicial process data from Rama Judicial portal using Firecrawl
async function scrapeProcessByRadicado(radicado: string, firecrawlApiKey: string): Promise<any> {
  // Build the URL for the Rama Judicial portal with the radicado
  const targetUrl = `https://consultaprocesos.ramajudicial.gov.co/Procesos/NumeroRadicacion?llave=${encodeURIComponent(radicado)}&Generate=Consultar`;

  console.log(`[judicial-process-lookup] Scraping URL: ${targetUrl}`);

  const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firecrawlApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: targetUrl,
      formats: [
        'markdown',
        {
          type: 'json',
          prompt: `Extract all judicial process information from this Colombian Rama Judicial page.
Return a JSON object with:
- processes: array of process objects, each with:
  - llaveProceso: the radicado/process number (string)
  - despacho: the court/despacho name (string)
  - departamento: department/city (string)
  - tipoProceso: type of legal process (string)
  - claseProceso: process class (string)
  - subclaseProceso: process subclass (string, optional)
  - ponente: judge/magistrate name (string, optional)
  - fechaProceso: filing date (string)
  - fechaUltimaActuacion: date of last action (string)
  - sujetos: array of parties with nombre (string), tipoSujeto (string, e.g. DEMANDANTE, DEMANDADO)
  - actuaciones: array of actions with fechaActuacion (string), actuacion (string), anotacion (string)
- found: boolean indicating if process was found
- errorMessage: string if there was an error or no results`,
        }
      ],
      waitFor: 5000,
      onlyMainContent: true,
    }),
  });

  if (!scrapeResponse.ok) {
    const errText = await scrapeResponse.text();
    throw new Error(`Firecrawl API error: ${scrapeResponse.status} - ${errText}`);
  }

  const scrapeData = await scrapeResponse.json();
  console.log(`[judicial-process-lookup] Firecrawl scrape success`);
  return scrapeData;
}

// Parse Firecrawl response into normalized process structure
function parseScrapedData(scrapeData: any, radicado: string): { processes: any[]; processDetails: any | null } {
  // Try structured JSON first
  const jsonData = scrapeData?.data?.json || scrapeData?.json;
  
  if (jsonData?.processes && Array.isArray(jsonData.processes) && jsonData.processes.length > 0) {
    const normalized = jsonData.processes.map((p: any) => ({
      idProceso: p.llaveProceso || radicado,
      llaveProceso: p.llaveProceso || radicado,
      fechaRadicacion: p.fechaProceso,
      fechaUltimaActuacion: p.fechaUltimaActuacion,
      despacho: p.despacho,
      departamento: p.departamento,
      tipoProceso: p.tipoProceso,
      claseProceso: p.claseProceso,
      subclaseProceso: p.subclaseProceso,
      ponente: p.ponente,
      ubicacion: p.departamento,
      sujetos: (p.sujetos || []).map((s: any) => ({
        nombre: s.nombre,
        tipoSujeto: s.tipoSujeto,
        representante: s.representante || '',
      })),
      actuaciones: (p.actuaciones || []).map((a: any) => ({
        fechaActuacion: a.fechaActuacion,
        actuacion: a.actuacion,
        anotacion: a.anotacion,
        fechaInicia: a.fechaInicia,
        fechaFinaliza: a.fechaFinaliza,
        fechaRegistro: a.fechaRegistro,
      })),
    }));

    return {
      processes: normalized,
      processDetails: normalized.length === 1 ? normalized[0] : null,
    };
  }

  // Fallback: if JSON extraction failed, return empty (markdown is available for AI analysis)
  console.warn('[judicial-process-lookup] JSON extraction from Firecrawl returned no processes');
  return { processes: [], processDetails: null };
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

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Firecrawl API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData = await req.json();
    const { queryType, radicado, followUpQuery, conversationHistory } = requestData;

    console.log('[judicial-process-lookup] Query:', { queryType, radicado });

    // Only radicado search is supported via Firecrawl scraping
    if (!radicado && queryType !== 'radicado') {
      return new Response(
        JSON.stringify({
          error: 'Solo se admite consulta por número de radicado en este modo',
          details: 'Ingrese el número de radicación para consultar el proceso'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processNumber = radicado;

    // Scrape from Rama Judicial portal
    const scrapeData = await scrapeProcessByRadicado(processNumber, FIRECRAWL_API_KEY);
    const { processes, processDetails } = parseScrapedData(scrapeData, processNumber);

    // Generate AI analysis if we have results or markdown
    let aiAnalysis = null;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const markdownContent = scrapeData?.data?.markdown || scrapeData?.markdown || '';

    if (OPENAI_API_KEY) {
      try {
        const [aiModel, systemPrompt] = await Promise.all([
          getRequiredConfig(serviceClient, 'process_query_ai_model'),
          getRequiredConfig(serviceClient, 'process_query_ai_prompt')
        ]);

        let userContent: string;

        if (followUpQuery) {
          userContent = `Datos del proceso:\n${JSON.stringify(processDetails || processes, null, 2)}\n\nPregunta: ${followUpQuery}`;
        } else if (processes.length > 0) {
          userContent = `Analiza este proceso judicial colombiano:\n${JSON.stringify(processDetails || processes[0], null, 2)}`;
        } else if (markdownContent) {
          userContent = `Analiza la siguiente información extraída del portal de la Rama Judicial de Colombia para el radicado ${processNumber}:\n\n${markdownContent.substring(0, 4000)}`;
        } else {
          userContent = `No se encontró información para el radicado ${processNumber}`;
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
            messages,
            max_tokens: 2000,
          }),
        });

        const aiData = await aiResponse.json();
        aiAnalysis = aiData.choices?.[0]?.message?.content;
      } catch (aiError) {
        console.error('[judicial-process-lookup] AI analysis error:', aiError);
        aiAnalysis = null;
      }
    }

    // Save to legal_tools_results
    try {
      await serviceClient.from('legal_tools_results').insert({
        lawyer_id: user.id,
        tool_type: 'judicial_process',
        input_data: { queryType: 'radicado', radicado: processNumber, followUpQuery },
        output_data: {
          processes,
          processDetails,
          aiAnalysis,
          processCount: processes.length,
          scrapedMarkdown: markdownContent.substring(0, 2000)
        },
        metadata: {
          source: 'firecrawl',
          portal: 'consultaprocesos.ramajudicial.gov.co',
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
        queryType: 'radicado',
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
