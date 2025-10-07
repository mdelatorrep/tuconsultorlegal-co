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
    const agentInstructions = await generateDocumentAgentInstructions(legalAgent, supabase);

    // Resolve model from system config (fallback to default)
    let model = 'gpt-4.1-2025-04-14';
    try {
      const { data: modelRow } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'agent_creation_ai_model')
        .maybeSingle();
      if (modelRow?.config_value) model = modelRow.config_value;
    } catch (e) {
      console.warn('Could not read agent_creation_ai_model, using default');
    }

    // Create new OpenAI Agent
    const openAIResponse = await fetch('https://api.openai.com/v1/assistants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        model: model,
        name: `${legalAgent.name} - Asistente de Documentos`,
        instructions: agentInstructions,
        tools: [
          { type: "web_search" },
          {
            type: "function",
            function: {
              name: "store_collected_data",
              description: "Guarda/actualiza en base de datos los placeholders recopilados para esta conversación",
              parameters: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    description: "Objeto clave-valor con placeholders y respuestas del usuario"
                  },
                  merge: {
                    type: "boolean",
                    description: "Si se debe mezclar con datos existentes (true) o sobrescribir (false)",
                    default: true
                  }
                },
                required: ["data"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "validate_information",
              description: "Valida si toda la información requerida ha sido recopilada",
              parameters: {
                type: "object",
                properties: {
                  collectedData: {
                    type: "object",
                    description: "Datos recopilados del usuario"
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
              description: "Solicita aclaración sobre información específica",
              parameters: {
                type: "object",
                properties: {
                  field: {
                    type: "string",
                    description: "Campo que necesita aclaración"
                  },
                  question: {
                    type: "string",
                    description: "Pregunta específica para aclarar"
                  }
                },
                required: ["field", "question"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "normalize_information",
              description: "Normaliza toda la información según estándares colombianos: mayúsculas, direcciones, fechas, monedas y ubicaciones geográficas",
              parameters: {
                type: "object",
                properties: {
                  rawData: {
                    type: "object",
                    description: "Datos sin normalizar que necesitan ser estandarizados"
                  },
                  includeGeographicSearch: {
                    type: "boolean",
                    description: "Si debe buscar información geográfica en línea",
                    default: true
                  }
                },
                required: ["rawData"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "generate_document",
              description: "Genera el documento final con la información recopilada y normalizada",
              parameters: {
                type: "object",
                properties: {
                  documentData: {
                    type: "object",
                    description: "Datos normalizados para completar el documento"
                  },
                  userRequests: {
                    type: "string",
                    description: "Solicitudes específicas del usuario"
                  }
                },
                required: ["documentData"]
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
        model: model,
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

async function getKnowledgeBaseUrls(supabase: any): Promise<string> {
  try {
    const { data: urls, error } = await supabase
      .from('knowledge_base_urls')
      .select('url, description, category, priority')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('category');

    if (error || !urls || urls.length === 0) {
      return 'No hay URLs específicas configuradas en la base de conocimiento.';
    }

    const urlsByCategory = urls.reduce((acc: any, url: any) => {
      if (!acc[url.category]) acc[url.category] = [];
      acc[url.category].push(url);
      return acc;
    }, {});

    let urlsText = '\nFUENTES OFICIALES AUTORIZADAS:\n';
    urlsText += 'IMPORTANTE: Solo puedes referenciar y recomendar consultar las siguientes fuentes oficiales:\n\n';

    Object.entries(urlsByCategory).forEach(([category, categoryUrls]: [string, any]) => {
      const categoryNames: { [key: string]: string } = {
        'legislacion': 'LEGISLACIÓN Y NORMATIVIDAD',
        'jurisprudencia': 'JURISPRUDENCIA Y DECISIONES JUDICIALES',
        'normatividad': 'NORMATIVIDAD LOCAL Y DISTRITAL',
        'doctrina': 'DOCTRINA JURÍDICA',
        'general': 'FUENTES GENERALES'
      };
      
      urlsText += `**${categoryNames[category] || category.toUpperCase()}:**\n`;
      categoryUrls.forEach((url: any) => {
        urlsText += `- ${url.url}${url.description ? ` - ${url.description}` : ''}\n`;
      });
      urlsText += '\n';
    });

    urlsText += 'INSTRUCCIONES PARA USO DE FUENTES:\n';
    urlsText += '- Solo referencias estas fuentes oficiales en tus respuestas\n';
    urlsText += '- Menciona la fuente específica cuando sea relevante\n';
    urlsText += '- Si el usuario pregunta sobre algo no cubierto por estas fuentes, explica que necesitas consultar fuentes oficiales adicionales\n';
    urlsText += '- Siempre prioriza la información de fuentes con mayor prioridad\n\n';

    return urlsText;
  } catch (error) {
    console.error('Error loading knowledge base URLs:', error);
    return 'Error al cargar las fuentes oficiales. Procede con información general.';
  }
}

async function generateDocumentAgentInstructions(legalAgent: any, supabase: any): Promise<string> {
  const placeholders = legalAgent.placeholder_fields || [];
  const placeholderList = placeholders.map((p: any) => 
    `- ${p.placeholder}: ${p.pregunta} (${p.tipo || 'texto'}${p.requerido ? ' - REQUERIDO' : ''})`
  ).join('\n');

  const knowledgeBaseUrls = await getKnowledgeBaseUrls(supabase);
  
  // Obtener conversation_blocks
  const { data: conversationBlocks } = await supabase
    .from('conversation_blocks')
    .select('*')
    .eq('legal_agent_id', legalAgent.id)
    .order('block_order');

  // Obtener field_instructions
  const { data: fieldInstructions } = await supabase
    .from('field_instructions')
    .select('*')
    .eq('legal_agent_id', legalAgent.id);

  // Generar guía de conversación estructurada
  let conversationGuide = '';
  if (conversationBlocks && conversationBlocks.length > 0) {
    conversationGuide = '\n\nGUÍA DE CONVERSACIÓN ESTRUCTURADA:\n';
    conversationGuide += 'IMPORTANTE: Debes seguir esta estructura de conversación en el ORDEN EXACTO indicado:\n\n';
    conversationBlocks.forEach((block: any, idx: number) => {
      conversationGuide += `BLOQUE ${idx + 1}: ${block.block_name}\n`;
      conversationGuide += `Frase introductoria: "${block.intro_phrase}"\n`;
      conversationGuide += `Placeholders a recopilar en este bloque: ${Array.isArray(block.placeholders) ? block.placeholders.join(', ') : 'ninguno'}\n`;
      conversationGuide += '\n';
    });
    conversationGuide += 'REGLAS DE LA GUÍA:\n';
    conversationGuide += '- Sigue los bloques en el orden establecido\n';
    conversationGuide += '- Usa la frase introductoria de cada bloque para iniciar esa sección\n';
    conversationGuide += '- Recopila TODOS los placeholders del bloque antes de pasar al siguiente\n';
    conversationGuide += '- Mantén el flujo conversacional natural mientras sigues la estructura\n\n';
  }

  // Generar instrucciones de campos
  let fieldInstructionsText = '';
  if (fieldInstructions && fieldInstructions.length > 0) {
    fieldInstructionsText = '\n\nINSTRUCCIONES ESPECÍFICAS POR CAMPO:\n';
    fieldInstructions.forEach((instruction: any) => {
      fieldInstructionsText += `\nCampo: ${instruction.field_name}\n`;
      if (instruction.validation_rule) {
        fieldInstructionsText += `Validación: ${instruction.validation_rule}\n`;
      }
      if (instruction.help_text) {
        fieldInstructionsText += `Ayuda: ${instruction.help_text}\n`;
      }
    });
    fieldInstructionsText += '\nAplica estas instrucciones cuando recopiles estos campos específicos.\n\n';
  }

  return `
Eres un asistente legal especializado en ayudar a crear "${legalAgent.document_name}" para ${legalAgent.target_audience === 'empresas' ? 'empresas' : 'personas naturales'}.

MISIÓN PRINCIPAL:
Recopilar toda la información necesaria para generar el documento legal de manera conversacional, amigable y eficiente, basándote únicamente en fuentes oficiales autorizadas.

DOCUMENTO A GENERAR: ${legalAgent.document_name}
AUDIENCIA: ${legalAgent.target_audience === 'empresas' ? 'Empresas y personas jurídicas' : 'Personas naturales'}
DESCRIPCIÓN: ${legalAgent.description}

INFORMACIÓN REQUERIDA:
${placeholderList}

INSTRUCCIONES DEL ABOGADO:
${legalAgent.ai_prompt}

${knowledgeBaseUrls}

${conversationGuide}

${fieldInstructionsText}

PROTOCOLO DE TRABAJO:
1. **SALUDO PROFESIONAL**: Preséntate como asistente especializado en ${legalAgent.document_name}
2. **EXPLICACIÓN CLARA**: Explica qué documento vas a ayudar a crear y por qué es importante
3. **RECOPILACIÓN CONVERSACIONAL**: 
   - Haz preguntas de manera natural y progresiva
   - No hagas más de 2-3 preguntas por mensaje
   - Adapta el lenguaje según la audiencia (${legalAgent.target_audience})
   - Explica por qué necesitas cada información
   - Referencia las fuentes oficiales cuando sea apropiado
4. **VALIDACIÓN CONTINUA**: Confirma la información recibida y aclara dudas
5. **NORMALIZACIÓN**: Antes de generar el documento, normaliza toda la información
6. **SEGUIMIENTO DEL PROGRESO**: Informa al usuario cuánta información falta
7. **FINALIZACIÓN**: Cuando tengas toda la información, confirma que está listo para generar

REGLAS IMPORTANTES:
- Usa la función validate_information para verificar la completitud de la información recopilada
- Usa request_clarification cuando necesites información adicional específica
- USA SIEMPRE normalize_information ANTES de generar el documento para estandarizar todos los datos:
  * Nombres propios en MAYÚSCULAS
  * Direcciones en formato estándar colombiano
  * Ciudades con departamento (ej: BOGOTÁ, CUNDINAMARCA)
  * Fechas en formato "DD de MMMM de YYYY"
  * Valores monetarios con puntos separadores y números en letras
  * Números de cédula con puntos separadores
- Usa generate_document SOLO cuando toda la información esté completa, validada y normalizada
- Mantén un tono profesional pero amigable
- ${legalAgent.target_audience === 'empresas' ? 'Usa terminología empresarial apropiada (razón social, NIT, representante legal)' : 'Usa lenguaje claro y accesible para personas naturales'}
- Explica términos legales cuando sea necesario
- NO generes el documento sin antes normalizar - este paso es OBLIGATORIO
- Pregunta una cosa a la vez para evitar abrumar al usuario
- Confirma información crítica antes de continuar
- SOLO usa las fuentes oficiales listadas arriba para cualquier referencia legal

FLUJO OBLIGATORIO PARA GENERACIÓN:
1. Recopilar información → 2. Validar completitud → 3. NORMALIZAR información → 4. Generar documento

TONO Y ESTILO:
- Profesional pero cercano
- Claro y directo
- Empático con las necesidades del usuario
- Educativo cuando sea apropiado
- Respaldado por fuentes oficiales

EJEMPLO DE INICIO:
"¡Hola! Soy tu asistente legal especializado en ${legalAgent.document_name}. Te voy a ayudar a recopilar toda la información necesaria para crear tu documento de manera rápida y eficiente.

Este documento es importante porque [explicar brevemente el propósito]. Para poder crearlo correctamente, necesitaré algunos datos específicos.

¿Podrías comenzar diciéndome [primera pregunta más importante]?"

¡Recuerda: Tu trabajo es hacer que el proceso sea fácil y comprensible para el usuario, asegurando siempre que toda la información esté correctamente normalizada según los estándares colombianos!
`;
}