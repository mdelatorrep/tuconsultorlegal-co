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

    // Generate document-specific instructions based on category and type
    const specificInstructions = generateSpecificInstructions(legalAgent);
    
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
${legalAgent.placeholder_fields ? JSON.stringify(legalAgent.placeholder_fields, null, 2) : 'No hay campos específicos definidos'}

INFORMACIÓN ADICIONAL REQUERIDA:
- Audiencia objetivo: ${legalAgent.target_audience}
- SLA habilitado: ${legalAgent.sla_enabled}
- Horas SLA: ${legalAgent.sla_hours || 'No especificado'}
- Precio sugerido: ${legalAgent.suggested_price || 'No especificado'}

INSTRUCCIONES ESPECÍFICAS DEL ABOGADO:
${legalAgent.ai_prompt}

${specificInstructions}

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
- Para ${legalAgent.target_audience}, ajusta el lenguaje apropiadamente
- Considera las implicaciones del SLA de ${legalAgent.sla_hours || 4} horas
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

// Generate document-specific instructions based on category and type
function generateSpecificInstructions(legalAgent: any): string {
  const category = legalAgent.category?.toLowerCase() || '';
  const documentName = legalAgent.document_name?.toLowerCase() || '';
  const targetAudience = legalAgent.target_audience || '';

  let specificInstructions = '';

  // Category-specific instructions
  if (category.includes('contrato') || category.includes('contract')) {
    specificInstructions += `
INSTRUCCIONES ESPECÍFICAS PARA CONTRATOS:
- Verifica que todas las partes estén claramente identificadas
- Asegúrate de incluir objeto del contrato, obligaciones y derechos
- Incluye cláusulas de resolución de conflictos
- Especifica términos y condiciones de pago si aplica
- Incluye cláusulas de terminación y causales de incumplimiento`;
  }

  if (category.includes('societario') || category.includes('corporate')) {
    specificInstructions += `
INSTRUCCIONES ESPECÍFICAS PARA DERECHO SOCIETARIO:
- Verifica el cumplimiento con el Código de Comercio colombiano
- Incluye información sobre capital social y participaciones
- Especifica órganos de administración y representación legal
- Incluye procedimientos de toma de decisiones
- Verifica requisitos de registro mercantil`;
  }

  if (category.includes('laboral') || category.includes('employment')) {
    specificInstructions += `
INSTRUCCIONES ESPECÍFICAS PARA DERECHO LABORAL:
- Cumple con el Código Sustantivo del Trabajo
- Incluye salarios, prestaciones sociales y horarios
- Especifica causales de terminación del contrato
- Incluye cláusulas de confidencialidad si aplica
- Verifica cumplimiento con normativas de seguridad social`;
  }

  if (category.includes('civil') || category.includes('family')) {
    specificInstructions += `
INSTRUCCIONES ESPECÍFICAS PARA DERECHO CIVIL:
- Verifica capacidad legal de las partes
- Incluye identificación completa de personas y bienes
- Especifica derechos y obligaciones claramente
- Incluye procedimientos de notificación
- Considera aspectos de derecho de familia si aplica`;
  }

  // Audience-specific instructions
  if (targetAudience === 'empresas') {
    specificInstructions += `
AJUSTES PARA AUDIENCIA EMPRESARIAL:
- Usa terminología comercial apropiada
- Incluye consideraciones de responsabilidad corporativa
- Especifica aspectos tributarios relevantes
- Incluye cláusulas de confidencialidad empresarial
- Considera implicaciones de compliance empresarial`;
  } else if (targetAudience === 'personas') {
    specificInstructions += `
AJUSTES PARA PERSONAS NATURALES:
- Usa lenguaje claro y accesible
- Explica términos legales complejos
- Incluye protección de derechos del consumidor
- Especifica derechos fundamentales aplicables
- Considera limitaciones económicas del individuo`;
  }

  return specificInstructions || `
INSTRUCCIONES GENERALES:
- Aplica principios generales del derecho colombiano
- Incluye cláusulas estándar de protección
- Verifica coherencia y completitud del documento
- Usa terminología jurídica apropiada`;
}