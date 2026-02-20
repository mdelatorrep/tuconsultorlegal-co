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

// ── Submit Firecrawl Agent job (no polling) ──────────────────────────────
async function submitFirecrawlAgentJob(radicado: string): Promise<string | null> {
  const FIRECRAWL_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_KEY) {
    console.warn('[firecrawl-agent] No API key configured');
    return null;
  }

  try {
    console.log(`[firecrawl-agent] Submitting agent job for radicado: ${radicado}`);

    const agentPrompt = `Go to https://consultaprocesos.ramajudicial.gov.co/procesos/Index and search for the radicado number '${radicado}'. Select 'Todos los Procesos' if prompted. Extract all judicial process details shown: court/despacho, parties (sujetos procesales), process type, status, filing date, last action date, and all proceedings/actuaciones with their dates and descriptions. For every extracted field, including nested items, provide the source URL in a corresponding field named with the suffix '_citation'. Capture all proceedings including dates, descriptions, and any document links.`;

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
      return null;
    }

    console.log(`[firecrawl-agent] Job submitted successfully: ${jobId}`);
    return jobId;
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

REGLAS CRÍTICAS:
- SOLO presenta información que provenga de los datos extraídos del portal oficial.
- NUNCA inventes, supongas o deduzcas información que no esté en los datos proporcionados (partes, estado, actuaciones, despacho).
- NO hagas "desglose del número de radicación" ni análisis genérico del formato del radicado.
- Si NO tienes datos reales del proceso, di claramente que la extracción está en progreso o no fue posible, y proporciona ÚNICAMENTE el enlace directo al portal para que el abogado consulte manualmente.
- Cuando SÍ tengas datos reales, preséntalos de forma estructurada y clara usando markdown con encabezados (##), listas y negritas.
- Siempre incluye el enlace directo: https://consultaprocesos.ramajudicial.gov.co`;

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
        contextParts.push(`## Datos extraídos del portal oficial:`);
        contextParts.push(JSON.stringify(processData, null, 2));
        contextParts.push(`\n## Tarea:`);
        contextParts.push(`Presenta la información extraída de forma clara y estructurada:`);
        contextParts.push(`1. Despacho y tipo de proceso`);
        contextParts.push(`2. Partes involucradas`);
        contextParts.push(`3. Estado actual del proceso`);
        contextParts.push(`4. Actuaciones más recientes (con fechas)`);
        contextParts.push(`5. Enlace directo al portal oficial`);
      } else {
        contextParts.push(`## IMPORTANTE: No se obtuvieron datos reales del proceso.`);
        contextParts.push(`No inventes ni supongas información. Responde brevemente indicando que:`);
        contextParts.push(`1. La extracción de datos del portal está en proceso o no fue posible en este momento.`);
        contextParts.push(`2. Proporciona el enlace directo para consulta manual: https://consultaprocesos.ramajudicial.gov.co/procesos/Index`);
        contextParts.push(`3. Sugiere al abogado intentar nuevamente en unos minutos.`);
      }

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

    // ── Step 1: Check for existing completed job ──────────────────────
    let processData: any = null;
    let processes: any[] = [];
    let firecrawlJobId: string | null = null;
    let jobStatus = 'none';

    if (!followUpQuery) {
      // Check if there's a recent completed job for this radicado
      const { data: existingJob } = await serviceClient
        .from('firecrawl_agent_jobs')
        .select('*')
        .eq('radicado', cleanTerm)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingJob?.extracted_data) {
        console.log('[judicial-process-lookup] Using cached extraction result');
        processData = mapAgentDataToProcess(existingJob.extracted_data, cleanTerm);
        processes = [processData];
        jobStatus = 'completed';
      } else {
        // Check if there's a pending/processing job
        const { data: pendingJob } = await serviceClient
          .from('firecrawl_agent_jobs')
          .select('id, firecrawl_job_id, status')
          .eq('radicado', cleanTerm)
          .in('status', ['pending', 'processing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pendingJob) {
          console.log(`[judicial-process-lookup] Existing job in progress: ${pendingJob.firecrawl_job_id}`);
          firecrawlJobId = pendingJob.firecrawl_job_id;
          jobStatus = 'processing';
        } else {
          // Submit new Firecrawl Agent job
          const newJobId = await submitFirecrawlAgentJob(cleanTerm);
          if (newJobId) {
            // Save job to DB for async processing
            await serviceClient.from('firecrawl_agent_jobs').insert({
              lawyer_id: user.id,
              radicado: cleanTerm,
              firecrawl_job_id: newJobId,
              status: 'pending',
              query_type: queryType || 'radicado',
            });
            firecrawlJobId = newJobId;
            jobStatus = 'submitted';
            console.log(`[judicial-process-lookup] Job saved to DB: ${newJobId}`);
          }
        }
      }
    }

    // ── Step 2: AI Analysis (immediate, always runs) ─────────────────
    const aiAnalysis = await analyzeWithOpenAI(
      cleanTerm,
      processData,
      followUpQuery,
      conversationHistory,
      systemPromptFromDB,
      aiModel
    );

    // ── Step 3: Save result ───────────────────────────────────────────
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
          firecrawlJobId,
          jobStatus,
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
        firecrawlJobStatus: jobStatus,
        firecrawlJobId,
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
