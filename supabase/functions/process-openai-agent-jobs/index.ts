import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Processing OpenAI agent jobs...');

    // Get pending jobs
    const { data: pendingJobs, error: fetchError } = await supabase
      .from('openai_agent_jobs')
      .select(`
        *,
        legal_agents (
          id,
          name,
          document_name,
          description,
          target_audience,
          ai_prompt,
          placeholder_fields,
          status
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5); // Process max 5 jobs at once

    if (fetchError) {
      throw new Error(`Error fetching pending jobs: ${fetchError.message}`);
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      console.log('No pending OpenAI agent jobs found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No pending jobs to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${pendingJobs.length} pending jobs to process`);
    const results = [];

    for (const job of pendingJobs) {
      try {
        // Mark job as processing
        await supabase
          .from('openai_agent_jobs')
          .update({ 
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        console.log(`Processing job ${job.id} for legal agent: ${job.legal_agents?.name}`);

        // Check if OpenAI agent already exists
        const { data: existingAgent } = await supabase
          .from('openai_agents')
          .select('id, openai_agent_id')
          .eq('legal_agent_id', job.legal_agent_id)
          .eq('status', 'active')
          .maybeSingle();

        if (existingAgent) {
          console.log(`OpenAI agent already exists for legal agent ${job.legal_agent_id}`);
          await supabase
            .from('openai_agent_jobs')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          // Update legal agent as OpenAI enabled
          await supabase
            .from('legal_agents')
            .update({ openai_enabled: true })
            .eq('id', job.legal_agent_id);

          results.push({
            job_id: job.id,
            legal_agent_id: job.legal_agent_id,
            status: 'completed',
            message: 'OpenAI agent already exists'
          });
          continue;
        }

        // Create OpenAI agent
        const legalAgent = job.legal_agents;
        if (!legalAgent) {
          throw new Error('Legal agent data not found');
        }

        const agentInstructions = generateDocumentAgentInstructions(legalAgent);

        // Create OpenAI Assistant
        const openAIResponse = await fetch('https://api.openai.com/v1/assistants', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({
            model: 'gpt-4.1-2025-04-14',
            name: `${legalAgent.name} - Asistente Automatizado`,
            instructions: agentInstructions,
            tools: [
              {
                type: "function",
                function: {
                  name: "collect_document_information",
                  description: "Collect and structure information needed for the legal document",
                  parameters: {
                    type: "object",
                    properties: {
                      collected_data: {
                        type: "object",
                        description: "Structured data collected from conversation"
                      },
                      completion_percentage: {
                        type: "number",
                        description: "Percentage of required information collected (0-100)"
                      },
                      missing_fields: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of missing required fields"
                      },
                      ready_to_generate: {
                        type: "boolean",
                        description: "Whether enough information has been collected to generate the document"
                      }
                    },
                    required: ["collected_data", "completion_percentage", "ready_to_generate"]
                  }
                }
              }
            ],
            metadata: {
              legal_agent_id: job.legal_agent_id,
              document_type: legalAgent.document_name,
              target_audience: legalAgent.target_audience,
              auto_created: 'true',
              created_by_system: 'auto-processor'
            }
          })
        });

        if (!openAIResponse.ok) {
          const errorData = await openAIResponse.text();
          throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorData}`);
        }

        const openAIAgent = await openAIResponse.json();

        // Save to database
        const { error: insertError } = await supabase
          .from('openai_agents')
          .insert({
            openai_agent_id: openAIAgent.id,
            name: openAIAgent.name,
            instructions: agentInstructions,
            model: 'gpt-4.1-2025-04-14',
            tools: openAIAgent.tools,
            tool_resources: openAIAgent.tool_resources || {},
            metadata: openAIAgent.metadata,
            legal_agent_id: job.legal_agent_id,
            status: 'active'
          });

        if (insertError) {
          // Try to delete the OpenAI agent if database save failed
          await fetch(`https://api.openai.com/v1/assistants/${openAIAgent.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'OpenAI-Beta': 'assistants=v2'
            }
          });
          throw insertError;
        }

        // Mark job as completed
        await supabase
          .from('openai_agent_jobs')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Update legal agent as OpenAI enabled
        await supabase
          .from('legal_agents')
          .update({ openai_enabled: true })
          .eq('id', job.legal_agent_id);

        console.log(`Successfully created OpenAI agent ${openAIAgent.id} for legal agent ${job.legal_agent_id}`);
        
        results.push({
          job_id: job.id,
          legal_agent_id: job.legal_agent_id,
          openai_agent_id: openAIAgent.id,
          status: 'completed',
          message: 'OpenAI agent created successfully'
        });

      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
        
        // Mark job as failed and increment retry count
        const retryCount = (job.retry_count || 0) + 1;
        const maxRetries = 3;
        
        await supabase
          .from('openai_agent_jobs')
          .update({ 
            status: retryCount >= maxRetries ? 'failed' : 'pending',
            error_message: error.message,
            retry_count: retryCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        results.push({
          job_id: job.id,
          legal_agent_id: job.legal_agent_id,
          status: 'failed',
          error: error.message,
          retry_count: retryCount
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${pendingJobs.length} jobs`,
      processed: pendingJobs.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in process-openai-agent-jobs:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function generateDocumentAgentInstructions(legalAgent: any): string {
  const placeholders = legalAgent.placeholder_fields || [];
  const placeholderList = placeholders.map((p: any) => 
    `- ${p.placeholder}: ${p.pregunta || p.description} (${p.tipo || 'texto'}${p.requerido ? ' - REQUERIDO' : ''})`
  ).join('\n');

  return `
Eres un asistente legal automatizado especializado en "${legalAgent.document_name}" para ${legalAgent.target_audience === 'empresas' ? 'empresas' : 'personas naturales'}.

MISIÓN: Recopilar información de manera conversacional y eficiente para generar documentos legales precisos.

DOCUMENTO: ${legalAgent.document_name}
AUDIENCIA: ${legalAgent.target_audience === 'empresas' ? 'Empresas y personas jurídicas' : 'Personas naturales'}
DESCRIPCIÓN: ${legalAgent.description}

INFORMACIÓN REQUERIDA:
${placeholderList}

INSTRUCCIONES ESPECÍFICAS DEL ABOGADO:
${legalAgent.ai_prompt}

PROTOCOLO AUTOMATIZADO:
1. Saludo profesional y explicación del documento
2. Recopilación progresiva (máximo 2-3 preguntas por mensaje)
3. Validación continua de la información recibida
4. Uso de collect_document_information para estructurar datos
5. Seguimiento del progreso y comunicación clara al usuario

REGLAS CRÍTICAS:
- Mantén un tono profesional pero amigable
- ${legalAgent.target_audience === 'empresas' ? 'Usa terminología empresarial (NIT, razón social, representante legal)' : 'Usa lenguaje accesible para personas naturales'}
- Explica por qué necesitas cada información
- NO generes documentos - solo recopila información
- Confirma información crítica antes de continuar
- Informa progreso: "Hemos completado X de Y campos necesarios"

¡Tu objetivo es hacer el proceso fácil y comprensible para crear documentos legales de calidad!
`;
}