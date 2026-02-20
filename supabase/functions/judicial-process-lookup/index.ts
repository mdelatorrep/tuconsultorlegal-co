import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema for Firecrawl v2 Agent API
const AGENT_SCHEMA = {
  type: "object",
  properties: {
    judicial_process_details: {
      type: "object",
      properties: {
        radication_number: { type: "string" },
        radication_number_citation: { type: "string" },
        court: { type: "string" },
        court_citation: { type: "string" },
        subject: { type: "string" },
        subject_citation: { type: "string" },
        parties: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              name_citation: { type: "string" },
              role: { type: "string" },
              role_citation: { type: "string" },
            },
            required: ["name", "name_citation", "role", "role_citation"],
          },
        },
        last_update_date: { type: "string" },
        last_update_date_citation: { type: "string" },
        process_status: { type: "string" },
        process_status_citation: { type: "string" },
        proceedings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string" },
              date_citation: { type: "string" },
              description: { type: "string" },
              description_citation: { type: "string" },
              document_link: { type: "string", description: "URL to the document if available" },
              document_link_citation: { type: "string" },
            },
            required: ["date", "date_citation", "description", "description_citation"],
          },
        },
      },
      required: [
        "radication_number", "radication_number_citation",
        "court", "court_citation",
        "subject", "subject_citation",
        "parties",
        "last_update_date", "last_update_date_citation",
        "process_status", "process_status_citation",
        "proceedings",
      ],
    },
  },
  required: ["judicial_process_details"],
};

// ── Firecrawl v2 Agent extraction ─────────────────────────────────────────
async function extractWithFirecrawlAgent(radicado: string): Promise<{ details: any; raw: any } | null> {
  const FIRECRAWL_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_KEY) {
    console.warn('[firecrawl-agent] No API key configured');
    return null;
  }

  try {
    console.log(`[firecrawl-agent] Submitting agent job for radicado: ${radicado}`);

    const agentPrompt = `Extract judicial process details for the radication number '${radicado}' using the 'Todos los Procesos' option on the Rama Judicial portal (https://siugj.ramajudicial.gov.co/principalPortal/consultarProceso.php). For every extracted field, including nested items, you must provide the source URL in a corresponding field named with the suffix '_citation'. Ensure you capture all proceedings, including the date, description, and any available links to documents.`;

    // Step 1: Submit agent job
    const submitResponse = await fetch('https://api.firecrawl.dev/v2/agent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: agentPrompt,
        schema: AGENT_SCHEMA,
        model: "spark-1-pro",
      }),
    });

    if (!submitResponse.ok) {
      const errText = await submitResponse.text();
      console.error('[firecrawl-agent] Submit error:', submitResponse.status, errText.slice(0, 300));
      return null;
    }

    const submitResult = await submitResponse.json();
    const jobId = submitResult.id;
    
    if (!jobId) {
      console.error('[firecrawl-agent] No job ID returned:', JSON.stringify(submitResult).slice(0, 200));
      // Check if data was returned directly (sync response)
      const directDetails = submitResult?.data?.judicial_process_details || submitResult?.judicial_process_details;
      if (directDetails) {
        return { details: directDetails, raw: submitResult };
      }
      return null;
    }

    console.log(`[firecrawl-agent] Job submitted: ${jobId}, polling for results...`);

    // Step 2: Poll for results (max ~5 min with 15-30s intervals)
    const maxAttempts = 12;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;
      const waitMs = attempt <= 2 ? 15000 : attempt <= 6 ? 20000 : 30000;
      await new Promise(resolve => setTimeout(resolve, waitMs));

      console.log(`[firecrawl-agent] Polling attempt ${attempt}/${maxAttempts}...`);

      const pollResponse = await fetch(`https://api.firecrawl.dev/v2/agent/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_KEY}`,
        },
      });

      if (!pollResponse.ok) {
        const errText = await pollResponse.text();
        console.error(`[firecrawl-agent] Poll error: ${pollResponse.status} ${errText.slice(0, 200)}`);
        if (pollResponse.status === 404) {
          console.error('[firecrawl-agent] Job not found, aborting');
          return null;
        }
        continue;
      }

      const pollResult = await pollResponse.json();
      const status = pollResult.status || pollResult.state;
      
      console.log(`[firecrawl-agent] Job status: ${status}`);

      if (status === 'completed' || status === 'done') {
        const details = pollResult?.data?.judicial_process_details || pollResult?.judicial_process_details || pollResult?.result?.judicial_process_details;
        if (details) {
          console.log('[firecrawl-agent] ✅ Data extracted successfully');
          return { details, raw: pollResult };
        }
        console.warn('[firecrawl-agent] Job completed but no judicial_process_details found');
        console.log('[firecrawl-agent] Response keys:', JSON.stringify(Object.keys(pollResult)));
        console.log('[firecrawl-agent] Full response:', JSON.stringify(pollResult).slice(0, 500));
        return null;
      }

      if (status === 'failed' || status === 'error') {
        console.error('[firecrawl-agent] Job failed:', JSON.stringify(pollResult).slice(0, 300));
        return null;
      }

      // Still processing, continue polling
    }

    console.warn(`[firecrawl-agent] Timeout after ${maxAttempts} polling attempts`);
    return null;
  } catch (err: any) {
    console.error('[firecrawl-agent] Exception:', err.message);
    return null;
  }
}

// ── Map agent data to process format ──────────────────────────────────────
function mapAgentDataToProcess(details: any, radicado: string): any {
  return {
    llaveProceso: radicado,
    despacho: details.court || null,
    tipoProceso: details.subject || null,
    claseProceso: details.process_status || null,
    fechaUltimaActuacion: details.last_update_date || null,
    source: 'firecrawl_agent_v2',
    sujetos: (details.parties || []).map((p: any) => ({
      nombre: p.name,
      tipoSujeto: p.role,
    })),
    actuaciones: (details.proceedings || []).map((p: any) => ({
      fechaActuacion: p.date,
      actuacion: p.description,
      anotacion: p.document_link || null,
      citacion: p.date_citation || null,
    })),
    citations: {
      court: details.court_citation,
      subject: details.subject_citation,
      lastUpdate: details.last_update_date_citation,
      status: details.process_status_citation,
    },
  };
}

// ── OpenAI analysis ────────────────────────────────────────────────────────
async function analyzeWithOpenAI(
  radicado: string,
  processData: any | null,
  followUpQuery?: string,
  conversationHistory?: any[],
  systemPromptOverride?: string,
  modelOverride?: string
): Promise<string | null> {
  const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_KEY) {
    console.warn('[openai] No API key configured');
    return null;
  }

  try {
    const systemPrompt = systemPromptOverride ||
      `Eres un asistente legal especializado en derecho procesal colombiano. 
Analiza información de procesos judiciales de la Rama Judicial de Colombia.
Cuando tengas datos reales del proceso, preséntales de forma estructurada y clara usando markdown.
Siempre proporciona el enlace directo al portal: https://consultaprocesos.ramajudicial.gov.co
Usa formato markdown con encabezados (##), listas y negritas para organizar la información.`;

    let userContent: string;

    if (followUpQuery && conversationHistory && conversationHistory.length > 0) {
      userContent = followUpQuery;
    } else {
      const contextParts: string[] = [
        `# Consulta de Proceso Judicial`,
        `**Número de Radicado:** ${radicado}`,
        '',
      ];

      if (processData) {
        contextParts.push(`## Datos extraídos del portal oficial (Firecrawl Agent v2):`);
        contextParts.push(JSON.stringify(processData, null, 2));
      } else {
        contextParts.push(`## Nota: No fue posible extraer datos automáticamente del portal`);
      }

      contextParts.push(`\n## Tarea:`);
      contextParts.push(`Basándote en la información disponible sobre el radicado ${radicado}:`);
      contextParts.push(`1. Analiza el proceso judicial con los datos disponibles`);
      contextParts.push(`2. Identifica las partes, tipo de proceso, despacho y estado`);
      contextParts.push(`3. Resume las actuaciones más recientes`);
      contextParts.push(`4. Proporciona recomendaciones legales relevantes`);
      contextParts.push(`5. Indica el enlace directo donde el abogado puede consultar el expediente`);

      userContent = contextParts.join('\n');
    }

    const messages: any[] = [{ role: 'system', content: systemPrompt }];
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory.slice(-6));
    }
    messages.push({ role: 'user', content: userContent });

    const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelOverride || 'gpt-4o',
        messages,
        max_tokens: 2500,
        temperature: 0.3,
      }),
    });

    if (!aiResp.ok) {
      console.error('[openai] Error:', aiResp.status);
      return null;
    }

    const aiData = await aiResp.json();
    return aiData.choices?.[0]?.message?.content || null;
  } catch (err: any) {
    console.error('[openai] Exception:', err.message);
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────
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
    const { queryType, radicado, documentNumber, followUpQuery, conversationHistory } = requestData;

    console.log('[judicial-process-lookup] Query:', { queryType, radicado, documentNumber });

    const searchTerm = radicado || documentNumber;
    if (!searchTerm) {
      return new Response(
        JSON.stringify({ error: 'Debe especificar un número de radicado o documento' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanTerm = searchTerm.replace(/\s/g, '');

    // ── Fetch AI config from DB ─────────────────────────────────────────
    const [modelConfigResult, promptConfigResult] = await Promise.allSettled([
      serviceClient.from('system_config').select('config_value').eq('config_key', 'process_query_ai_model').maybeSingle(),
      serviceClient.from('system_config').select('config_value').eq('config_key', 'process_query_ai_prompt').maybeSingle(),
    ]);

    const aiModel = (modelConfigResult.status === 'fulfilled' ? modelConfigResult.value.data?.config_value : null) || 'gpt-4o';
    const systemPromptFromDB = (promptConfigResult.status === 'fulfilled' ? promptConfigResult.value.data?.config_value : null) || undefined;
    console.log(`[judicial-process-lookup] Using model: ${aiModel}, prompt from DB: ${!!systemPromptFromDB}`);

    // ── Step 1: Firecrawl Agent v2 extraction ───────────────────────────
    let processData: any = null;
    let processes: any[] = [];

    if (!followUpQuery) {
      const agentResult = await extractWithFirecrawlAgent(cleanTerm);
      if (agentResult) {
        processData = mapAgentDataToProcess(agentResult.details, cleanTerm);
        processes = [processData];
        console.log(`[judicial-process-lookup] Agent extracted: court=${processData.despacho}, proceedings=${processData.actuaciones?.length}`);
      }
    }

    // ── Step 2: AI Analysis ──────────────────────────────────────────────
    const aiAnalysis = await analyzeWithOpenAI(
      cleanTerm,
      processData,
      followUpQuery,
      conversationHistory,
      systemPromptFromDB,
      aiModel
    );

    // ── Step 3: Save result ───────────────────────────────────────────────
    try {
      await serviceClient.from('legal_tools_results').insert({
        lawyer_id: user.id,
        tool_type: 'judicial_process',
        input_data: { queryType, radicado: cleanTerm, followUpQuery },
        output_data: {
          processes,
          processDetails: processes[0] || null,
          aiAnalysis,
          processCount: processes.length,
        },
        metadata: {
          source: 'firecrawl_agent_v2',
          strategies_used: [
            processData ? 'firecrawl_agent' : null,
            aiAnalysis ? 'openai' : null,
          ].filter(Boolean),
          portal: 'siugj.ramajudicial.gov.co',
          timestamp: new Date().toISOString(),
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
        queryType: 'radicado',
        source: 'firecrawl_agent_v2',
        portalUrl: 'https://siugj.ramajudicial.gov.co/principalPortal/consultarProceso.php',
        _debug: {
          hasAgentData: !!processData,
          hasOpenAI: !!Deno.env.get('OPENAI_API_KEY'),
          hasFirecrawl: !!Deno.env.get('FIRECRAWL_API_KEY'),
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[judicial-process-lookup] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        details: 'Error al consultar el sistema de la Rama Judicial.',
        processes: [],
        processCount: 0,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
