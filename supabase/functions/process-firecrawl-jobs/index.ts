import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  processData: any,
  systemPromptOverride?: string,
  modelOverride?: string
): Promise<string | null> {
  const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_KEY) return null;

  try {
    const systemPrompt = systemPromptOverride ||
      `Eres un asistente legal especializado en derecho procesal colombiano. 
Analiza información de procesos judiciales de la Rama Judicial de Colombia.
Presenta los datos de forma estructurada y clara usando markdown.
Siempre proporciona el enlace directo al portal: https://consultaprocesos.ramajudicial.gov.co
Usa formato markdown con encabezados (##), listas y negritas.`;

    const contextParts: string[] = [
      `# Consulta de Proceso Judicial`,
      `**Número de Radicado:** ${radicado}`,
      '',
      `## Datos extraídos del portal oficial (Firecrawl Agent v2):`,
      JSON.stringify(processData, null, 2),
      `\n## Tarea:`,
      `Basándote en los datos extraídos del radicado ${radicado}:`,
      `1. Analiza el proceso judicial`,
      `2. Identifica las partes, tipo de proceso, despacho y estado`,
      `3. Resume las actuaciones más recientes`,
      `4. Proporciona recomendaciones legales relevantes`,
      `5. Indica el enlace directo donde el abogado puede consultar el expediente`,
    ];

    const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelOverride || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contextParts.join('\n') },
        ],
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
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const FIRECRAWL_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_KEY) {
      return new Response(
        JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find pending/processing jobs
    const { data: jobs, error: fetchError } = await serviceClient
      .from('firecrawl_agent_jobs')
      .select('*')
      .in('status', ['pending', 'processing'])
      .lt('poll_attempts', 12)
      .order('created_at', { ascending: true })
      .limit(5);

    if (fetchError) {
      console.error('[processor] Error fetching jobs:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch jobs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!jobs || jobs.length === 0) {
      console.log('[processor] No pending Firecrawl agent jobs');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No pending jobs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[processor] Processing ${jobs.length} Firecrawl agent jobs...`);

    // Fetch AI config once
    const [modelConfigResult, promptConfigResult] = await Promise.allSettled([
      serviceClient.from('system_config').select('config_value').eq('config_key', 'process_query_ai_model').maybeSingle(),
      serviceClient.from('system_config').select('config_value').eq('config_key', 'process_query_ai_prompt').maybeSingle(),
    ]);
    const aiModel = (modelConfigResult.status === 'fulfilled' ? modelConfigResult.value.data?.config_value : null) || 'gpt-4o';
    const systemPromptFromDB = (promptConfigResult.status === 'fulfilled' ? promptConfigResult.value.data?.config_value : null) || undefined;

    let processed = 0;
    let completed = 0;

    for (const job of jobs) {
      try {
        console.log(`[processor] Polling job ${job.firecrawl_job_id} (attempt ${job.poll_attempts + 1})...`);

        const pollResponse = await fetch(`https://api.firecrawl.dev/v2/agent/${job.firecrawl_job_id}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${FIRECRAWL_KEY}` },
        });

        if (!pollResponse.ok) {
          const errText = await pollResponse.text();
          console.error(`[processor] Poll error for ${job.firecrawl_job_id}: ${pollResponse.status}`);

          if (pollResponse.status === 404) {
            await serviceClient.from('firecrawl_agent_jobs').update({
              status: 'failed',
              error_message: 'Job not found on Firecrawl',
              poll_attempts: job.poll_attempts + 1,
              last_polled_at: new Date().toISOString(),
            }).eq('id', job.id);
          } else {
            await serviceClient.from('firecrawl_agent_jobs').update({
              poll_attempts: job.poll_attempts + 1,
              last_polled_at: new Date().toISOString(),
            }).eq('id', job.id);
          }
          processed++;
          continue;
        }

        const pollResult = await pollResponse.json();
        const status = pollResult.status || pollResult.state;
        console.log(`[processor] Job ${job.firecrawl_job_id} status: ${status}`);

        if (status === 'completed' || status === 'done') {
          const details = pollResult?.data?.judicial_process_details 
            || pollResult?.judicial_process_details 
            || pollResult?.result?.judicial_process_details;

          if (details) {
            console.log(`[processor] ✅ Job ${job.firecrawl_job_id} extracted data successfully`);
            
            const processData = mapAgentDataToProcess(details, job.radicado);
            
            // Generate AI analysis with the extracted data
            const aiAnalysis = await analyzeWithOpenAI(
              job.radicado,
              processData,
              systemPromptFromDB,
              aiModel
            );

            await serviceClient.from('firecrawl_agent_jobs').update({
              status: 'completed',
              extracted_data: details,
              ai_analysis: aiAnalysis,
              poll_attempts: job.poll_attempts + 1,
              last_polled_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            }).eq('id', job.id);

            // Also save to legal_tools_results
            await serviceClient.from('legal_tools_results').insert({
              lawyer_id: job.lawyer_id,
              tool_type: 'judicial_process',
              input_data: { queryType: job.query_type, radicado: job.radicado },
              output_data: {
                processes: [processData],
                processDetails: processData,
                aiAnalysis,
                processCount: 1,
              },
              metadata: {
                source: 'firecrawl_agent_v2_async',
                firecrawlJobId: job.firecrawl_job_id,
                portal: 'siugj.ramajudicial.gov.co',
                timestamp: new Date().toISOString(),
              }
            });

            completed++;
          } else {
            console.warn(`[processor] Job completed but no data found`);
            console.log(`[processor] Response: ${JSON.stringify(pollResult).slice(0, 500)}`);
            
            await serviceClient.from('firecrawl_agent_jobs').update({
              status: 'completed_no_data',
              error_message: 'Job completed but no judicial_process_details in response',
              extracted_data: pollResult,
              poll_attempts: job.poll_attempts + 1,
              last_polled_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            }).eq('id', job.id);
          }
        } else if (status === 'failed' || status === 'error') {
          await serviceClient.from('firecrawl_agent_jobs').update({
            status: 'failed',
            error_message: pollResult.error || 'Agent job failed',
            poll_attempts: job.poll_attempts + 1,
            last_polled_at: new Date().toISOString(),
          }).eq('id', job.id);
        } else {
          // Still processing
          const newStatus = job.poll_attempts + 1 >= job.max_poll_attempts ? 'timeout' : 'processing';
          
          await serviceClient.from('firecrawl_agent_jobs').update({
            status: newStatus,
            poll_attempts: job.poll_attempts + 1,
            last_polled_at: new Date().toISOString(),
            ...(newStatus === 'timeout' ? { error_message: `Timeout after ${job.max_poll_attempts} poll attempts` } : {}),
          }).eq('id', job.id);

          if (newStatus === 'timeout') {
            console.warn(`[processor] Job ${job.firecrawl_job_id} timed out`);
          }
        }

        processed++;
      } catch (jobErr: any) {
        console.error(`[processor] Error processing job ${job.id}:`, jobErr.message);
        await serviceClient.from('firecrawl_agent_jobs').update({
          poll_attempts: job.poll_attempts + 1,
          last_polled_at: new Date().toISOString(),
          error_message: jobErr.message,
        }).eq('id', job.id);
        processed++;
      }
    }

    console.log(`[processor] Done. Processed: ${processed}, Completed: ${completed}`);

    return new Response(
      JSON.stringify({ success: true, processed, completed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[processor] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
