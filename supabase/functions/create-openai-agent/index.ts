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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { legalAgentId, agentConfig } = await req.json();

    console.log('Creating OpenAI agent for legal agent:', legalAgentId);

    // Get legal agent details
    const { data: legalAgent, error: fetchError } = await supabase
      .from('legal_agents')
      .select('*')
      .eq('id', legalAgentId)
      .single();

    if (fetchError || !legalAgent) {
      throw new Error('Legal agent not found');
    }

    // Create specialized OpenAI agent with function calling capabilities
    const agentInstructions = `
Eres un asistente legal especializado en ${legalAgent.category}. Tu nombre es ${legalAgent.name}.

RESPONSABILIDADES PRINCIPALES:
- Generar documentos legales de alta calidad basados en plantillas específicas
- Recopilar información necesaria del usuario mediante conversación natural
- Validar la completitud y coherencia de la información proporcionada
- Aplicar las mejores prácticas legales y de redacción

CONTEXTO DEL DOCUMENTO:
- Tipo: ${legalAgent.document_name}
- Descripción: ${legalAgent.description}
- Categoría: ${legalAgent.category}
- Audiencia objetivo: ${legalAgent.target_audience}

PLANTILLA BASE:
${legalAgent.template_content}

CAMPOS REQUERIDOS:
${JSON.stringify(legalAgent.placeholder_fields, null, 2)}

INSTRUCCIONES ESPECÍFICAS:
${legalAgent.ai_prompt}

FLUJO DE TRABAJO:
1. Saluda al usuario y explica qué documento vas a ayudar a crear
2. Recopila TODA la información necesaria usando una conversación natural
3. Valida que tienes toda la información antes de generar el documento
4. Genera el documento final aplicando la plantilla con los datos recopilados
5. Ofrece revisiones o ajustes si es necesario

HERRAMIENTAS DISPONIBLES:
- generate_document: Para crear el documento final
- validate_information: Para verificar que tienes toda la información necesaria
- request_clarification: Para solicitar información adicional al usuario

REGLAS IMPORTANTES:
- SIEMPRE valida la información antes de generar documentos
- Usa un lenguaje profesional pero amigable
- No generes documentos con información incompleta
- Solicita aclaraciones cuando sea necesario
- Aplica las normativas legales colombianas cuando sea relevante
`;

    // Create OpenAI Agent with function calling
    const openAIResponse = await fetch('https://api.openai.com/v1/assistants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        model: agentConfig?.model || 'gpt-4o',
        name: legalAgent.name,
        instructions: agentInstructions,
        tools: [
          {
            type: "function",
            function: {
              name: "generate_document",
              description: "Generate the final legal document using the collected information",
              parameters: {
                type: "object",
                properties: {
                  documentData: {
                    type: "object",
                    description: "All the collected information to fill the document template"
                  },
                  userRequests: {
                    type: "string",
                    description: "Any specific requests or modifications from the user"
                  }
                },
                required: ["documentData"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "validate_information",
              description: "Validate that all required information has been collected",
              parameters: {
                type: "object",
                properties: {
                  collectedData: {
                    type: "object",
                    description: "The information collected so far"
                  }
                },
                required: ["collectedData"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "request_clarification",
              description: "Request additional or clarifying information from the user",
              parameters: {
                type: "object",
                properties: {
                  question: {
                    type: "string",
                    description: "The specific question or clarification needed"
                  },
                  field: {
                    type: "string",
                    description: "The field or area that needs clarification"
                  }
                },
                required: ["question"]
              }
            }
          }
        ],
        metadata: {
          legal_agent_id: legalAgentId,
          category: legalAgent.category,
          document_type: legalAgent.document_name,
          created_by_system: 'tuconsultorlegal'
        }
      })
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIAgent = await openAIResponse.json();
    console.log('OpenAI agent created successfully:', openAIAgent.id);

    // Save agent in our database
    const { data: savedAgent, error: saveError } = await supabase
      .from('openai_agents')
      .insert({
        legal_agent_id: legalAgentId,
        openai_agent_id: openAIAgent.id,
        name: legalAgent.name,
        model: agentConfig?.model || 'gpt-4o',
        instructions: agentInstructions,
        tools: openAIAgent.tools,
        tool_resources: openAIAgent.tool_resources || {},
        metadata: openAIAgent.metadata,
        status: 'active'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving agent to database:', saveError);
      // Try to delete the OpenAI agent if database save failed
      await fetch(`https://api.openai.com/v1/assistants/${openAIAgent.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      throw saveError;
    }

    console.log('Agent saved to database successfully');

    // Update legal agent status to indicate it has an OpenAI agent
    await supabase
      .from('legal_agents')
      .update({ status: 'active' })
      .eq('id', legalAgentId);

    return new Response(JSON.stringify({
      success: true,
      openai_agent_id: openAIAgent.id,
      agent_data: savedAgent,
      message: 'OpenAI agent created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating OpenAI agent:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});