import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { legal_agent_id, force_recreate = false } = await req.json();

    if (!legal_agent_id) {
      return new Response(JSON.stringify({ error: 'legal_agent_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Creating OpenAI agent for legal agent: ${legal_agent_id}`);

    // Get the legal agent details
    const { data: legalAgent, error: fetchError } = await supabase
      .from('legal_agents')
      .select('*')
      .eq('id', legal_agent_id)
      .single();

    if (fetchError || !legalAgent) {
      throw new Error(`Legal agent not found: ${fetchError?.message}`);
    }

    // Check if OpenAI agent already exists
    const { data: existingAgent, error: existingError } = await supabase
      .from('openai_agents')
      .select('*')
      .eq('legal_agent_id', legal_agent_id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingAgent && !force_recreate) {
      return new Response(JSON.stringify({
        success: true,
        message: 'OpenAI agent already exists',
        openai_agent_id: existingAgent.openai_agent_id,
        agent_id: existingAgent.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If recreating, deactivate existing agent
    if (existingAgent && force_recreate) {
      await supabase
        .from('openai_agents')
        .update({ status: 'inactive' })
        .eq('id', existingAgent.id);

      // Delete from OpenAI
      try {
        await fetch(`https://api.openai.com/v1/assistants/${existingAgent.openai_agent_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
      } catch (deleteError) {
        console.warn('Could not delete existing OpenAI agent:', deleteError);
      }
    }

    // Generate enhanced instructions for the OpenAI agent
    const agentInstructions = generateDocumentAgentInstructions(legalAgent);

    // Create new OpenAI Agent
    const openAIResponse = await fetch('https://api.openai.com/v1/assistants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        name: `${legalAgent.name} - Asistente de Documentos`,
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
          },
          {
            type: "function", 
            function: {
              name: "validate_document_data",
              description: "Validate collected data against document requirements",
              parameters: {
                type: "object",
                properties: {
                  validation_results: {
                    type: "object",
                    description: "Results of data validation"
                  },
                  errors: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of validation errors"
                  },
                  warnings: {
                    type: "array", 
                    items: { type: "string" },
                    description: "List of validation warnings"
                  }
                },
                required: ["validation_results"]
              }
            }
          }
        ],
        metadata: {
          legal_agent_id: legal_agent_id,
          document_type: legalAgent.document_name,
          target_audience: legalAgent.target_audience,
          created_by_system: 'tuconsultorlegal',
          version: '2.0'
        }
      })
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      console.error(`OpenAI API error:`, errorData);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIAgent = await openAIResponse.json();
    console.log(`OpenAI agent created successfully: ${openAIAgent.id}`);

    // Save to database
    const { data: dbAgent, error: insertError } = await supabase
      .from('openai_agents')
      .insert({
        openai_agent_id: openAIAgent.id,
        name: openAIAgent.name,
        instructions: agentInstructions,
        model: 'gpt-4.1-2025-04-14',
        tools: openAIAgent.tools,
        tool_resources: openAIAgent.tool_resources || {},
        metadata: openAIAgent.metadata,
        legal_agent_id: legal_agent_id,
        status: 'active'
      })
      .select()
      .single();

    if (insertError) {
      console.error(`Error saving agent to database:`, insertError);
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

    return new Response(JSON.stringify({
      success: true,
      message: 'OpenAI agent created successfully',
      openai_agent_id: openAIAgent.id,
      agent_id: dbAgent.id,
      legal_agent_id: legal_agent_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating OpenAI agent:', error);
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
    `- ${p.placeholder}: ${p.pregunta} (${p.tipo || 'texto'}${p.requerido ? ' - REQUERIDO' : ''})`
  ).join('\n');

  return `
Eres un asistente legal especializado en ayudar a crear "${legalAgent.document_name}" para ${legalAgent.target_audience === 'empresas' ? 'empresas' : 'personas naturales'}.

MISIÓN PRINCIPAL:
Recopilar toda la información necesaria para generar el documento legal de manera conversacional, amigable y eficiente.

DOCUMENTO A GENERAR: ${legalAgent.document_name}
AUDIENCIA: ${legalAgent.target_audience === 'empresas' ? 'Empresas y personas jurídicas' : 'Personas naturales'}
DESCRIPCIÓN: ${legalAgent.description}

INFORMACIÓN REQUERIDA:
${placeholderList}

INSTRUCCIONES DEL ABOGADO:
${legalAgent.ai_prompt}

PROTOCOLO DE TRABAJO:
1. **SALUDO PROFESIONAL**: Preséntate como asistente especializado en ${legalAgent.document_name}
2. **EXPLICACIÓN CLARA**: Explica qué documento vas a ayudar a crear y por qué es importante
3. **RECOPILACIÓN CONVERSACIONAL**: 
   - Haz preguntas de manera natural y progresiva
   - No hagas más de 2-3 preguntas por mensaje
   - Adapta el lenguaje según la audiencia (${legalAgent.target_audience})
   - Explica por qué necesitas cada información
4. **VALIDACIÓN CONTINUA**: Confirma la información recibida y aclara dudas
5. **SEGUIMIENTO DEL PROGRESO**: Informa al usuario cuánta información falta
6. **FINALIZACIÓN**: Cuando tengas toda la información, confirma que está listo para generar

REGLAS IMPORTANTES:
- Usa la función collect_document_information para estructurar los datos recopilados
- Usa validate_document_data para verificar la completitud de la información
- Mantén un tono profesional pero amigable
- ${legalAgent.target_audience === 'empresas' ? 'Usa terminología empresarial apropiada (razón social, NIT, representante legal)' : 'Usa lenguaje claro y accesible para personas naturales'}
- Explica términos legales cuando sea necesario
- NO generes el documento - solo recopila la información
- Pregunta una cosa a la vez para evitar abrumar al usuario
- Confirma información crítica antes de continuar

TONO Y ESTILO:
- Profesional pero cercano
- Claro y directo
- Empático con las necesidades del usuario
- Educativo cuando sea apropiado

EJEMPLO DE INICIO:
"¡Hola! Soy tu asistente legal especializado en ${legalAgent.document_name}. Te voy a ayudar a recopilar toda la información necesaria para crear tu documento de manera rápida y eficiente.

Este documento es importante porque [explicar brevemente el propósito]. Para poder crearlo correctamente, necesitaré algunos datos específicos.

¿Podrías comenzar diciéndome [primera pregunta más importante]?"

¡Recuerda: Tu trabajo es hacer que el proceso sea fácil y comprensible para el usuario!
`;
}