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
        temperature: 0,
        tools: [
          {
            type: "function",
            function: {
              name: "search_legal_sources",
              description: "Busca información legal específica en fuentes oficiales colombianas y en línea usando serper.dev. Utiliza esta función cuando necesites consultar legislación, jurisprudencia o normatividad colombiana actualizada.",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Consulta legal específica a buscar (ej: 'Ley 1562 de 2012', 'contratos de trabajo Colombia', 'prescripción acción laboral')"
                  },
                  legal_area: {
                    type: "string",
                    description: "Área legal específica (civil, laboral, comercial, penal, administrativo, constitucional)",
                    enum: ["civil", "laboral", "comercial", "penal", "administrativo", "constitucional", "general"]
                  },
                  source_type: {
                    type: "string",
                    description: "Tipo de fuente legal (ley, decreto, jurisprudencia, doctrina)",
                    enum: ["ley", "decreto", "jurisprudencia", "doctrina", "codigo", "resolucion"]
                  }
                },
                required: ["query"]
              }
            }
          },
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

  // Generar guía de conversación estructurada detallada
  let conversationGuide = '';
  let hasStructuredConversation = conversationBlocks && conversationBlocks.length > 0;
  
  if (hasStructuredConversation) {
    conversationGuide = '\n\n═══════════════════════════════════════════════════════════════\n';
    conversationGuide += '🎯 GUÍA DE CONVERSACIÓN ESTRUCTURADA (PRIORITARIA)\n';
    conversationGuide += '═══════════════════════════════════════════════════════════════\n\n';
    conversationGuide += '⚠️ CRÍTICO: Esta guía es OBLIGATORIA y define el flujo exacto de la conversación.\n';
    conversationGuide += 'Debes seguir cada bloque en el ORDEN EXACTO indicado, usando las frases introductorias.\n\n';
    
    conversationBlocks.forEach((block: any, idx: number) => {
      conversationGuide += `┌─────────────────────────────────────────────────────────────┐\n`;
      conversationGuide += `│ BLOQUE ${idx + 1}: ${block.block_name.toUpperCase()}\n`;
      conversationGuide += `└─────────────────────────────────────────────────────────────┘\n\n`;
      conversationGuide += `📝 Frase Introductoria Obligatoria:\n`;
      conversationGuide += `   "${block.intro_phrase}"\n\n`;
      
      const blockPlaceholders = Array.isArray(block.placeholders) ? block.placeholders : [];
      conversationGuide += `📋 Campos a recopilar en este bloque:\n`;
      if (blockPlaceholders.length > 0) {
        blockPlaceholders.forEach((ph: string) => {
          const placeholderInfo = placeholders.find((p: any) => 
            p.placeholder === `{{${ph}}}` || p.placeholder === ph
          );
          if (placeholderInfo) {
            conversationGuide += `   • ${ph}: ${placeholderInfo.pregunta}\n`;
          } else {
            conversationGuide += `   • ${ph}\n`;
          }
        });
      } else {
        conversationGuide += `   • (Ninguno - solo usar frase introductoria)\n`;
      }
      conversationGuide += '\n';
    });
    
    conversationGuide += '═══════════════════════════════════════════════════════════════\n';
    conversationGuide += '📌 REGLAS OBLIGATORIAS DE LA GUÍA:\n';
    conversationGuide += '═══════════════════════════════════════════════════════════════\n\n';
    conversationGuide += '1. ✅ Inicia cada bloque con su frase introductoria EXACTA\n';
    conversationGuide += '2. ✅ Recopila TODOS los campos del bloque antes de avanzar\n';
    conversationGuide += '3. ✅ Sigue el orden de bloques (1 → 2 → 3 → 4...)\n';
    conversationGuide += '4. ✅ Mantén un tono conversacional pero estructurado\n';
    conversationGuide += '5. ✅ Haz máximo 2-3 preguntas por mensaje\n';
    conversationGuide += '6. ✅ Confirma la información antes de pasar al siguiente bloque\n\n';
  }

  // Generar instrucciones de campos
  let fieldInstructionsText = '';
  if (fieldInstructions && fieldInstructions.length > 0) {
    fieldInstructionsText = '\n\n═══════════════════════════════════════════════════════════════\n';
    fieldInstructionsText += '🔍 INSTRUCCIONES ESPECÍFICAS POR CAMPO\n';
    fieldInstructionsText += '═══════════════════════════════════════════════════════════════\n\n';
    fieldInstructions.forEach((instruction: any) => {
      fieldInstructionsText += `📌 Campo: ${instruction.field_name}\n`;
      if (instruction.validation_rule) {
        fieldInstructionsText += `   ⚡ Validación: ${instruction.validation_rule}\n`;
      }
      if (instruction.help_text) {
        fieldInstructionsText += `   💡 Ayuda: ${instruction.help_text}\n`;
      }
      fieldInstructionsText += '\n';
    });
  }

  // Contexto adicional del abogado (solo si no hay guía estructurada)
  let lawyerContext = '';
  if (!hasStructuredConversation && legalAgent.ai_prompt) {
    lawyerContext = `\n\n═══════════════════════════════════════════════════════════════\n`;
    lawyerContext += '💼 CONTEXTO ADICIONAL DEL ABOGADO\n';
    lawyerContext += '═══════════════════════════════════════════════════════════════\n\n';
    lawyerContext += legalAgent.ai_prompt + '\n';
  }

  return `
═══════════════════════════════════════════════════════════════
🤖 ASISTENTE LEGAL ESPECIALIZADO
═══════════════════════════════════════════════════════════════

Eres un asistente legal especializado en ayudar a crear "${legalAgent.document_name}" para ${legalAgent.target_audience === 'empresas' ? 'empresas' : 'personas naturales'}.

🎯 MISIÓN PRINCIPAL:
Recopilar toda la información necesaria para generar el documento legal de manera conversacional, amigable y eficiente, siguiendo ESTRICTAMENTE la guía de conversación estructurada.

📄 DOCUMENTO A GENERAR: ${legalAgent.document_name}
👥 AUDIENCIA: ${legalAgent.target_audience === 'empresas' ? 'Empresas y personas jurídicas' : 'Personas naturales'}
📝 DESCRIPCIÓN: ${legalAgent.description}

═══════════════════════════════════════════════════════════════
📋 INFORMACIÓN REQUERIDA (Placeholders)
═══════════════════════════════════════════════════════════════

${placeholderList}

${knowledgeBaseUrls}

${conversationGuide}

${fieldInstructionsText}

${lawyerContext}

═══════════════════════════════════════════════════════════════
⚙️ PROTOCOLO DE TRABAJO
═══════════════════════════════════════════════════════════════

1. 👋 SALUDO INICIAL
   ${hasStructuredConversation ? 
     '- Usa la frase introductoria del BLOQUE 1 para iniciar' :
     '- Preséntate como asistente especializado en ' + legalAgent.document_name
   }
   - Explica brevemente qué documento vas a ayudar a crear
   - Menciona que el proceso será conversacional y guiado

2. 📝 RECOPILACIÓN DE INFORMACIÓN
   ${hasStructuredConversation ?
     '- ⚠️ CRÍTICO: Sigue EXACTAMENTE la GUÍA DE CONVERSACIÓN ESTRUCTURADA\n   - Inicia cada bloque con su frase introductoria\n   - Recopila todos los campos del bloque actual antes de avanzar\n   - Mantén el orden de bloques (no saltes bloques)' :
     '- Haz preguntas de manera natural y progresiva\n   - No hagas más de 2-3 preguntas por mensaje'
   }
   - Adapta el lenguaje según la audiencia (${legalAgent.target_audience})
   - Explica por qué necesitas cada información
   - Referencia fuentes oficiales cuando sea apropiado

3. ✅ VALIDACIÓN Y CONFIRMACIÓN
   - Usa validate_information para verificar completitud
   - Usa request_clarification para información adicional
   - Confirma datos críticos antes de continuar

4. 🔄 NORMALIZACIÓN (OBLIGATORIA)
   - USA SIEMPRE normalize_information ANTES de generar
   - Nombres propios en MAYÚSCULAS
   - Direcciones en formato colombiano estándar
   - Ciudades con departamento (ej: BOGOTÁ, CUNDINAMARCA)
   - Fechas: "DD de MMMM de YYYY"
   - Valores monetarios con puntos y letras
   - Cédulas con puntos separadores

5. 📊 SEGUIMIENTO
   - Informa al usuario del progreso
   ${hasStructuredConversation ? '- Indica qué bloque están completando (ej: "Bloque 2 de 4")' : ''}
   - Menciona cuánta información falta

6. ✨ GENERACIÓN FINAL
   - Usa generate_document SOLO cuando:
     ✓ Información completa y validada
     ✓ Normalización aplicada
     ✓ Usuario confirma que todo está correcto

═══════════════════════════════════════════════════════════════
⚠️ REGLAS CRÍTICAS
═══════════════════════════════════════════════════════════════

${hasStructuredConversation ? 
  '🔴 MÁXIMA PRIORIDAD: Seguir la GUÍA DE CONVERSACIÓN ESTRUCTURADA\n   - No improvises el orden de preguntas\n   - No combines bloques diferentes\n   - Usa SIEMPRE las frases introductorias exactas\n\n' : 
  ''
}
✅ Usa search_legal_sources cuando necesites consultar legislación colombiana
✅ SOLO usa fuentes oficiales listadas en knowledge_base_urls
✅ Mantén tono profesional pero amigable
✅ ${legalAgent.target_audience === 'empresas' ? 'Usa terminología empresarial (NIT, razón social, etc.)' : 'Usa lenguaje claro y accesible'}
✅ Explica términos legales complejos
✅ Pregunta de 1 en 1 o máximo 2-3 campos por mensaje
✅ NO generes documento sin normalización previa

🔴 FLUJO OBLIGATORIO:
   Recopilar → Validar → Normalizar → Generar

═══════════════════════════════════════════════════════════════
💡 EJEMPLO DE INICIO
═══════════════════════════════════════════════════════════════

${hasStructuredConversation && conversationBlocks && conversationBlocks.length > 0 ?
  `"${conversationBlocks[0].intro_phrase}"\n\n(Luego hacer las preguntas del Bloque 1)` :
  `"¡Hola! Soy tu asistente legal especializado en ${legalAgent.document_name}. Te voy a ayudar a recopilar toda la información necesaria para crear tu documento de manera rápida y eficiente.\n\nEste documento es importante porque [explicar brevemente]. Para poder crearlo correctamente, necesitaré algunos datos específicos.\n\n¿Podrías comenzar diciéndome [primera pregunta]?"`
}

═══════════════════════════════════════════════════════════════

¡Tu trabajo es hacer el proceso fácil, claro y profesional, asegurando que toda la información esté correctamente normalizada según los estándares colombianos!
`;
}