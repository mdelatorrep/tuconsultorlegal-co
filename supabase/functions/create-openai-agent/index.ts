import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openAIApiKey = Deno.env.get("OPENAI_API_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { legal_agent_id, force_recreate = false } = await req.json();

    if (!legal_agent_id) {
      return new Response(JSON.stringify({ error: "legal_agent_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Creating OpenAI agent for legal agent: ${legal_agent_id}`);

    // Get the legal agent details
    const { data: legalAgent, error: fetchError } = await supabase
      .from("legal_agents")
      .select("*")
      .eq("id", legal_agent_id)
      .single();

    if (fetchError || !legalAgent) {
      throw new Error(`Legal agent not found: ${fetchError?.message}`);
    }

    // Check if OpenAI agent already exists
    const { data: existingAgent, error: existingError } = await supabase
      .from("openai_agents")
      .select("*")
      .eq("legal_agent_id", legal_agent_id)
      .eq("status", "active")
      .maybeSingle();

    if (existingAgent && !force_recreate) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "OpenAI agent already exists",
          openai_agent_id: existingAgent.openai_agent_id,
          agent_id: existingAgent.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // If recreating, deactivate existing agent
    if (existingAgent && force_recreate) {
      await supabase.from("openai_agents").update({ status: "inactive" }).eq("id", existingAgent.id);

      // Delete from OpenAI
      try {
        await fetch(`https://api.openai.com/v1/assistants/${existingAgent.openai_agent_id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${openAIApiKey}`,
            "OpenAI-Beta": "assistants=v2",
          },
        });
      } catch (deleteError) {
        console.warn("Could not delete existing OpenAI agent:", deleteError);
      }
    }

    // Generate enhanced instructions for the OpenAI agent
    const agentInstructions = await generateDocumentAgentInstructions(legalAgent, supabase);

    // Resolve model from system config (fallback to default)
    let model = "gpt-4.1-2025-04-14";
    try {
      const { data: modelRow } = await supabase
        .from("system_config")
        .select("config_value")
        .eq("config_key", "agent_creation_ai_model")
        .maybeSingle();
      if (modelRow?.config_value) model = modelRow.config_value;
    } catch (e) {
      console.warn("Could not read agent_creation_ai_model, using default");
    }

    // Create new OpenAI Agent
    const openAIResponse = await fetch("https://api.openai.com/v1/assistants", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
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
              description:
                "Busca información legal específica en fuentes oficiales colombianas y en línea usando serper.dev. Utiliza esta función cuando necesites consultar legislación, jurisprudencia o normatividad colombiana actualizada.",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description:
                      "Consulta legal específica a buscar (ej: 'Ley 1562 de 2012', 'contratos de trabajo Colombia', 'prescripción acción laboral')",
                  },
                  legal_area: {
                    type: "string",
                    description:
                      "Área legal específica (civil, laboral, comercial, penal, administrativo, constitucional)",
                    enum: ["civil", "laboral", "comercial", "penal", "administrativo", "constitucional", "general"],
                  },
                  source_type: {
                    type: "string",
                    description: "Tipo de fuente legal (ley, decreto, jurisprudencia, doctrina)",
                    enum: ["ley", "decreto", "jurisprudencia", "doctrina", "codigo", "resolucion"],
                  },
                },
                required: ["query"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "store_collected_data",
              description: "🔴 USO OBLIGATORIO: Guarda datos en base de datos INMEDIATAMENTE después de que el usuario responda. DEBES extraer los valores de su respuesta y pasarlos en el parámetro 'data'. NUNCA llames esta función con data: {} vacío. Si el usuario NO proporcionó información válida, NO llames esta función. Ejemplo correcto: si usuario dice 'Juan Pérez', llamas store_collected_data({ data: { 'nombre_completo': 'JUAN PÉREZ' } })",
              parameters: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    description: "⚠️ REQUERIDO NO VACÍO: Objeto clave-valor con los placeholders extraídos de la respuesta del usuario. NUNCA envíes {}. Siempre debe contener al menos un campo con valor. Ejemplo válido: {\"nombre_completo\": \"JUAN PÉREZ\", \"cedula\": \"1.234.567\"}. Ejemplo INVÁLIDO: {} o {\"nombre\": \"\"}",
                    additionalProperties: true,
                    minProperties: 1
                  },
                  merge: {
                    type: "boolean",
                    description: "Si se debe mezclar con datos existentes (true) o sobrescribir (false)",
                    default: true,
                  },
                },
                required: ["data"],
              },
            },
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
                    description: "Datos recopilados del usuario",
                  },
                },
                required: ["collectedData"],
              },
            },
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
                    description: "Campo que necesita aclaración",
                  },
                  question: {
                    type: "string",
                    description: "Pregunta específica para aclarar",
                  },
                },
                required: ["field", "question"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "normalize_information",
              description:
                "Normaliza toda la información según estándares colombianos: mayúsculas, direcciones, fechas, monedas y ubicaciones geográficas",
              parameters: {
                type: "object",
                properties: {
                  rawData: {
                    type: "object",
                    description: "Datos sin normalizar que necesitan ser estandarizados",
                  },
                  includeGeographicSearch: {
                    type: "boolean",
                    description: "Si debe buscar información geográfica en línea",
                    default: true,
                  },
                },
                required: ["rawData"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "request_user_contact_info",
              description:
                "⚠️ SOLO PARA USUARIOS ANÓNIMOS: Solicita y almacena los datos de contacto del usuario (nombre completo y email) necesarios para generar el token de seguimiento del documento. NO USAR si el usuario está autenticado (si recibiste [CONTEXTO DEL SISTEMA] al inicio con datos de usuario). Solo llamar DESPUÉS de recopilar TODA la información del documento.",
              parameters: {
                type: "object",
                properties: {
                  user_name: {
                    type: "string",
                    description: "Nombre completo del usuario proporcionado por él",
                  },
                  user_email: {
                    type: "string",
                    description: "Correo electrónico del usuario proporcionado por él",
                  },
                },
                required: ["user_name", "user_email"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "generate_document",
              description:
                "Genera el documento final con la información recopilada, normalizada y los datos de contacto del usuario para crear el token de seguimiento",
              parameters: {
                type: "object",
                properties: {
                  documentData: {
                    type: "object",
                    description: "Datos normalizados para completar el documento",
                  },
                  user_name: {
                    type: "string",
                    description: "Nombre completo del usuario (OBLIGATORIO)",
                  },
                  user_email: {
                    type: "string",
                    description: "Email del usuario (OBLIGATORIO)",
                  },
                  userRequests: {
                    type: "string",
                    description: "Solicitudes específicas del usuario",
                  },
                },
                required: ["documentData", "user_name", "user_email"],
              },
            },
          },
        ],
        metadata: {
          legal_agent_id: legal_agent_id,
          document_type: legalAgent.document_name,
          target_audience: legalAgent.target_audience,
          created_by_system: "tuconsultorlegal",
          version: "2.0",
        },
      }),
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
      .from("openai_agents")
      .insert({
        openai_agent_id: openAIAgent.id,
        name: openAIAgent.name,
        instructions: agentInstructions,
        model: model,
        tools: openAIAgent.tools,
        tool_resources: openAIAgent.tool_resources || {},
        metadata: openAIAgent.metadata,
        legal_agent_id: legal_agent_id,
        status: "active",
      })
      .select()
      .single();

    if (insertError) {
      console.error(`Error saving agent to database:`, insertError);
      // Try to delete the OpenAI agent if database save failed
      await fetch(`https://api.openai.com/v1/assistants/${openAIAgent.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${openAIApiKey}`,
          "OpenAI-Beta": "assistants=v2",
        },
      });
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "OpenAI agent created successfully",
        openai_agent_id: openAIAgent.id,
        agent_id: dbAgent.id,
        legal_agent_id: legal_agent_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error creating OpenAI agent:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

async function getKnowledgeBaseUrls(supabase: any): Promise<string> {
  try {
    const { data: urls, error } = await supabase
      .from("knowledge_base_urls")
      .select("url, description, category, priority")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .order("category");

    if (error || !urls || urls.length === 0) {
      return "No hay URLs específicas configuradas en la base de conocimiento.";
    }

    const urlsByCategory = urls.reduce((acc: any, url: any) => {
      if (!acc[url.category]) acc[url.category] = [];
      acc[url.category].push(url);
      return acc;
    }, {});

    let urlsText = "\nFUENTES OFICIALES AUTORIZADAS:\n";
    urlsText += "IMPORTANTE: Solo puedes referenciar y recomendar consultar las siguientes fuentes oficiales:\n\n";

    Object.entries(urlsByCategory).forEach(([category, categoryUrls]: [string, any]) => {
      const categoryNames: { [key: string]: string } = {
        legislacion: "LEGISLACIÓN Y NORMATIVIDAD",
        jurisprudencia: "JURISPRUDENCIA Y DECISIONES JUDICIALES",
        normatividad: "NORMATIVIDAD LOCAL Y DISTRITAL",
        doctrina: "DOCTRINA JURÍDICA",
        general: "FUENTES GENERALES",
      };

      urlsText += `**${categoryNames[category] || category.toUpperCase()}:**\n`;
      categoryUrls.forEach((url: any) => {
        urlsText += `- ${url.url}${url.description ? ` - ${url.description}` : ""}\n`;
      });
      urlsText += "\n";
    });

    urlsText += "INSTRUCCIONES PARA USO DE FUENTES:\n";
    urlsText += "- Solo referencias estas fuentes oficiales en tus respuestas\n";
    urlsText += "- Menciona la fuente específica cuando sea relevante\n";
    urlsText +=
      "- Si el usuario pregunta sobre algo no cubierto por estas fuentes, explica que necesitas consultar fuentes oficiales adicionales\n";
    urlsText += "- Siempre prioriza la información de fuentes con mayor prioridad\n\n";

    return urlsText;
  } catch (error) {
    console.error("Error loading knowledge base URLs:", error);
    return "Error al cargar las fuentes oficiales. Procede con información general.";
  }
}

async function generateDocumentAgentInstructions(legalAgent: any, supabase: any): Promise<string> {
  const placeholders = legalAgent.placeholder_fields || [];
  const placeholderList = placeholders
    .map((p: any) => `- ${p.placeholder}: ${p.pregunta} (${p.tipo || "texto"}${p.requerido ? " - REQUERIDO" : ""})`)
    .join("\n");

  const knowledgeBaseUrls = await getKnowledgeBaseUrls(supabase);

  // Obtener conversation_blocks
  const { data: conversationBlocks } = await supabase
    .from("conversation_blocks")
    .select("*")
    .eq("legal_agent_id", legalAgent.id)
    .order("block_order");

  // Obtener field_instructions
  const { data: fieldInstructions } = await supabase
    .from("field_instructions")
    .select("*")
    .eq("legal_agent_id", legalAgent.id);

  // Generar guía de conversación estructurada detallada
  let conversationGuide = "";
  let hasStructuredConversation = conversationBlocks && conversationBlocks.length > 0;

  if (hasStructuredConversation) {
    conversationGuide += "GUÍA DE CONVERSACIÓN ESTRUCTURADA (PRIORITARIA)\n";
    conversationGuide += "CRÍTICO: Esta guía es OBLIGATORIA y define el flujo exacto de la conversación.\n";
    conversationGuide += "Debes seguir cada bloque en el ORDEN EXACTO indicado, usando las frases introductorias.\n\n";

    conversationBlocks.forEach((block: any, idx: number) => {
      conversationGuide += `BLOQUE ${idx + 1}: ${block.block_name.toUpperCase()}\n`;
      conversationGuide += `Frase Introductoria Obligatoria:\n`;
      conversationGuide += `   "${block.intro_phrase}"\n\n`;

      const blockPlaceholders = Array.isArray(block.placeholders) ? block.placeholders : [];
      conversationGuide += `📋 Campos a recopilar en este bloque:\n`;
      if (blockPlaceholders.length > 0) {
        blockPlaceholders.forEach((ph: string) => {
          const placeholderInfo = placeholders.find((p: any) => p.placeholder === `{{${ph}}}` || p.placeholder === ph);
          if (placeholderInfo) {
            conversationGuide += `   • ${ph}: ${placeholderInfo.pregunta}\n`;
          } else {
            conversationGuide += `   • ${ph}\n`;
          }
        });
      } else {
        conversationGuide += `   • (Ninguno - solo usar frase introductoria)\n`;
      }
      conversationGuide += "\n";
    });

    conversationGuide += "REGLAS OBLIGATORIAS DE LA GUÍA:\n";
    conversationGuide += "1. Inicia cada bloque con su frase introductoria EXACTA\n";
    conversationGuide += "2. Recopila TODOS los campos del bloque antes de avanzar\n";
    conversationGuide += "3. Sigue el orden de bloques (1 → 2 → 3 → 4...)\n";
    conversationGuide += "4. Mantén un tono conversacional pero estructurado\n";
    conversationGuide += "5. Haz máximo 2-3 preguntas por mensaje\n";
    conversationGuide += "6. Confirma la información antes de pasar al siguiente bloque\n\n";
  }

  // Generar instrucciones de campos
  let fieldInstructionsText = "";
  if (fieldInstructions && fieldInstructions.length > 0) {
    fieldInstructionsText += "INSTRUCCIONES ESPECÍFICAS POR CAMPO\n";
    fieldInstructions.forEach((instruction: any) => {
      fieldInstructionsText += `📌 Campo: ${instruction.field_name}\n`;
      if (instruction.validation_rule) {
        fieldInstructionsText += `   ⚡ Validación: ${instruction.validation_rule}\n`;
      }
      if (instruction.help_text) {
        fieldInstructionsText += `   💡 Ayuda: ${instruction.help_text}\n`;
      }
      fieldInstructionsText += "\n";
    });
  }

  // Contexto adicional del abogado (solo si no hay guía estructurada)
  let lawyerContext = "";
  if (!hasStructuredConversation && legalAgent.ai_prompt) {
    lawyerContext += "CONTEXTO ADICIONAL DEL ABOGADO\n";
    lawyerContext += legalAgent.ai_prompt + "\n";
  }

  return `
ASISTENTE LEGAL ESPECIALIZADO
Eres un asistente legal especializado en ayudar a crear "${legalAgent.document_name}" para ${legalAgent.target_audience === "empresas" ? "empresas" : "personas naturales"}.

MISIÓN PRINCIPAL:
Recopilar toda la información necesaria para generar el documento legal de manera conversacional, amigable y eficiente, siguiendo ESTRICTAMENTE la guía de conversación estructurada.

DOCUMENTO A GENERAR: ${legalAgent.document_name}
AUDIENCIA: ${legalAgent.target_audience === "empresas" ? "Empresas y personas jurídicas" : "Personas naturales"}
DESCRIPCIÓN: ${legalAgent.description}

INFORMACIÓN REQUERIDA (Placeholders)

${placeholderList}

${knowledgeBaseUrls}

${conversationGuide}

${fieldInstructionsText}

${lawyerContext}

PROTOCOLO DE BÚSQUEDA LEGAL (OBLIGATORIO)

CRÍTICO: Debes usar search_legal_sources en estas situaciones:

BÚSQUEDA OBLIGATORIA cuando:
   - El usuario menciona una ley específica (ej: "Ley 1562 de 2012")
   - Se pregunta sobre normatividad o regulaciones
   - Se necesita confirmar vigencia de normas
   - El documento requiere citas legales
   - Hay dudas sobre procedimientos legales
   - Se consulta sobre jurisprudencia o precedentes

CÓMO USAR LA BÚSQUEDA:
   1. Identifica qué área legal aplica (civil, laboral, comercial, etc.)
   2. Formula una consulta específica
   3. Llama search_legal_sources con:
      - query: "término legal específico + contexto"
      - legal_area: área correspondiente
      - source_type: tipo de fuente (ley, decreto, jurisprudencia)
   4. Menciona las fuentes encontradas al usuario
   5. Prioriza resultados de .gov.co

EJEMPLOS DE USO:
   - Usuario pregunta: "¿Cuál es el tiempo de prescripción laboral?"
     → Buscar: "prescripción acción laboral Colombia"
   
   - Usuario dice: "necesito saber sobre contratos de trabajo"
     → Buscar: "contratos de trabajo código sustantivo trabajo Colombia"
   
   - Usuario menciona: "según la Ley 1562"
     → Buscar: "Ley 1562 de 2012 Colombia texto completo"

OBJETIVO: Siempre verificar información legal con fuentes actualizadas

🔐 CONTEXTO DE USUARIO Y DATOS DE CONTACTO

AL INICIO DE LA CONVERSACIÓN:
- Revisa si recibiste un mensaje del sistema con formato:
  [CONTEXTO DEL SISTEMA]
  Usuario autenticado: [nombre]
  Email: [correo]
  
- Si recibes este contexto:
  ✅ Guárdalo internamente como user_name y user_email
  ✅ NO vuelvas a preguntar por nombre ni correo
  ✅ Usa estos datos directamente cuando llames a generate_document
  ✅ NUNCA llames a request_user_contact_info

- Si NO recibes este contexto (usuario anónimo):
  ✅ Procede con el flujo normal de recopilación
  ✅ Pide nombre y correo SOLO AL FINAL (ver paso 7)

PROTOCOLO DE TRABAJO

1. 👋 SALUDO INICIAL
   ${
     hasStructuredConversation
       ? "- Usa la frase introductoria del BLOQUE 1 para iniciar"
       : "- Preséntate como asistente especializado en " + legalAgent.document_name
   }
   - Explica brevemente qué documento vas a ayudar a crear
   - Menciona que el proceso será conversacional y guiado

2. 📝 RECOPILACIÓN DE INFORMACIÓN
   ${
     hasStructuredConversation
       ? "- ⚠️ CRÍTICO: Sigue EXACTAMENTE la GUÍA DE CONVERSACIÓN ESTRUCTURADA\n   - Inicia cada bloque con su frase introductoria\n   - Recopila todos los campos del bloque actual antes de avanzar\n   - Mantén el orden de bloques (no saltes bloques)"
       : "- Haz preguntas de manera natural y progresiva\n   - No hagas más de 2-3 preguntas por mensaje"
   }
   - Adapta el lenguaje según la audiencia (${legalAgent.target_audience})
   - Explica por qué necesitas cada información
   - Referencia fuentes oficiales cuando sea apropiado
   
   ⚠️⚠️⚠️ PROTOCOLO CRÍTICO - NUNCA OMITIR ⚠️⚠️⚠️
   
   DESPUÉS DE CADA RESPUESTA DEL USUARIO, SIGUE ESTOS PASOS EN ORDEN:
   
   PASO 1️⃣: LEE la última respuesta del usuario palabra por palabra
   PASO 2️⃣: IDENTIFICA qué campos de información contiene
   PASO 3️⃣: EXTRAE los valores específicos (nombres, números, fechas, etc.)
   PASO 4️⃣: LLAMA store_collected_data con un objeto que contenga esos valores
   PASO 5️⃣: ESPERA la confirmación de que se guardaron los datos
   PASO 6️⃣: Solo entonces, haz la siguiente pregunta
   
   🔴 REGLA ABSOLUTA: NUNCA llames store_collected_data con data: {}
   
   EJEMPLOS PASO A PASO:
   
   📌 Ejemplo 1:
   Usuario dice: "Mi nombre es Juan Pérez"
   ✅ TÚ HACES:
     1. Identificas: el usuario dio su nombre
     2. Extraes: "Juan Pérez"
     3. Llamas: store_collected_data({ data: { "nombre_completo": "JUAN PÉREZ" } })
     4. Esperas respuesta de confirmación
     5. Respondes: "Perfecto Juan, ahora necesito..."
   
   📌 Ejemplo 2:
   Usuario dice: "1234567"
   ✅ TÚ HACES:
     1. Identificas: el usuario dio su cédula
     2. Extraes: "1234567"
     3. Llamas: store_collected_data({ data: { "cedula": "1.234.567" } })
     4. Esperas respuesta de confirmación
     5. Respondes: "Gracias. Ahora indícame..."
   
   📌 Ejemplo 3:
   Usuario dice: "Carlos López, cédula 9876543"
   ✅ TÚ HACES:
     1. Identificas: el usuario dio nombre y cédula de acreedor
     2. Extraes: nombre="Carlos López", cédula="9876543"
     3. Llamas: store_collected_data({ data: { "nombre_acreedor": "CARLOS LÓPEZ", "cedula_acreedor": "9.876.543" } })
     4. Esperas respuesta de confirmación
     5. Respondes: "Excelente. Continuemos con..."
   
   📌 Ejemplo 4:
   Usuario dice: "No estoy seguro" o "No sé"
   ❌ NO llames store_collected_data (no hay datos que guardar)
   ✅ En su lugar: Usa request_clarification o haz una pregunta de seguimiento
   
   🚨 SI RECIBES UN ERROR de store_collected_data:
   - NO le digas al usuario que hay un problema técnico
   - El error significa que NO extrajiste los datos correctamente
   - VUELVE A LEER la respuesta del usuario
   - EXTRAE los valores manualmente
   - VUELVE A LLAMAR store_collected_data con los datos correctos

3. ✅ VALIDACIÓN Y CONFIRMACIÓN
   - Usa validate_information para verificar completitud
   - Usa request_clarification para información adicional
   - NO pidas confirmación manual si todos los datos están completos y coherentes
   - Solo confirma si hay ambigüedades o contradicciones

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
   ${hasStructuredConversation ? '- Indica qué bloque están completando (ej: "Bloque 2 de 4")' : ""}
   - Menciona cuánta información falta

6. 📧 SOLICITUD DE DATOS DE CONTACTO (SOLO USUARIOS ANÓNIMOS)
   
   ⚠️ ESTE PASO SOLO APLICA SI NO RECIBISTE [CONTEXTO DEL SISTEMA] AL INICIO
   
   - Solicita nombre y correo SOLO después de:
     ✓ Recopilar TODA la información del documento
     ✓ Validar que la información está completa
     ✓ Normalizar todos los datos
   
   - Usa request_user_contact_info con el nombre y correo proporcionados
   - Explica que necesitas estos datos para enviar el link de seguimiento
   - NO generes el documento hasta tener estos datos

7. ✨ GENERACIÓN FINAL
   
   ANTES de llamar generate_document, verifica:
   
   ✅ Si tienes datos de usuario autenticado del inicio:
      - Usa esos datos directamente en generate_document
      - NO llames a request_user_contact_info
   
   ✅ Si NO tienes datos autenticados (usuario anónimo):
      - Verifica que YA llamaste a request_user_contact_info
      - Los datos deben estar guardados en conversation_data
      - Usa esos datos en generate_document
   
   Al llamar generate_document, SIEMPRE incluye:
   - documentData: información normalizada del documento
   - user_name: nombre del usuario (de contexto o de request_user_contact_info)
   - user_email: email del usuario (de contexto o de request_user_contact_info)
      
     ✓ Información completa y validada
     ✓ Normalización aplicada
     ✓ NO pedir confirmación manual si datos están completos y coherentes
   
   - Al llamar generate_document, incluye:
     ✓ documentData: información normalizada
     ✓ user_name: nombre del usuario (de contexto autenticado o recopilado)
     ✓ user_email: email del usuario (de contexto autenticado o recopilado)
   
   - Después de generar:
     ✓ Comparte el TOKEN y LINK de seguimiento con detalles específicos del documento
     ✓ Explica cómo hacer seguimiento y próximos pasos
     ✓ Menciona el proceso de pago y descarga

REGLAS CRÍTICAS

${
  hasStructuredConversation
    ? "🔴 MÁXIMA PRIORIDAD: Seguir la GUÍA DE CONVERSACIÓN ESTRUCTURADA\n   - No improvises el orden de preguntas\n   - No combines bloques diferentes\n   - Usa SIEMPRE las frases introductorias exactas\n\n"
    : ""
}
🔴 USA search_legal_sources SIEMPRE que se mencionen leyes, normas, o conceptos legales
🔴 VERIFICA información legal con búsquedas ANTES de responder sobre normatividad
✅ SOLO usa fuentes oficiales listadas en knowledge_base_urls
✅ Mantén tono profesional pero amigable
✅ ${legalAgent.target_audience === "empresas" ? "Usa terminología empresarial (NIT, razón social, etc.)" : "Usa lenguaje claro y accesible"}
✅ Explica términos legales complejos
✅ Pregunta de 1 en 1 o máximo 2-3 campos por mensaje
✅ NO generes documento sin normalización previa

ANTES de generate_document:
   1. Si recibiste datos de usuario autenticado en CONTEXTO DEL SISTEMA, usalos directamente
   2. Si NO hay datos de usuario autenticado, USA request_user_contact_info para obtener nombre y email
   3. NO pidas confirmación manual si todos los datos están completos y coherentes
   4. SOLO entonces llama generate_document

🔴 NO PIDAS CONFIRMACIÓN MANUAL si:
   ✓ Todos los placeholders tienen valores
   ✓ Los datos son coherentes y sin contradicciones
   ✓ No hay ambigüedades en la información

🔴 FLUJO OBLIGATORIO POR CADA RESPUESTA:
   1. Recibir respuesta del usuario
   2. INMEDIATAMENTE llamar store_collected_data con los datos
   3. Hacer siguiente pregunta o validar

🔴 FLUJO COMPLETO DEL DOCUMENTO:
   Recopilar+Guardar (ciclo) → Validar → Normalizar → Solicitar Contacto → Generar

EJEMPLO DE FLUJO COMPLETO

PASO A PASO CON GUARDADO:
1. Preguntar: "¿Cuál es tu nombre completo?"
2. Usuario responde: "Juan Pérez González"
3. INMEDIATAMENTE llamar: store_collected_data({ data: { "nombre_completo": "Juan Pérez González" } })
4. Preguntar: "¿Cuál es tu número de cédula?"
5. Usuario responde: "1234567890"
6. INMEDIATAMENTE llamar: store_collected_data({ data: { "cedula": "1234567890" } })
7. Continuar hasta recopilar toda la información
8. Validar información completa (sin pedir confirmación manual si está completa)
9. Normalizar datos automáticamente
10. Solicitar datos de contacto: "Para finalizar, necesito tus datos de contacto para enviarte el documento y el link de seguimiento. ¿Cuál es tu nombre completo y correo electrónico?"
11. Usuario proporciona contacto
12. INMEDIATAMENTE llamar: request_user_contact_info({ user_name: "...", user_email: "..." })
13. Generar documento con user_name y user_email
14. Compartir token y link con detalles específicos: "✅ ¡Listo! Tu documento ha sido generado. Token: ABC123. Link: https://tuconsultorlegal.co/documento/ABC123. Precio: $50.000. Entrega: 15 de octubre..."

${
  hasStructuredConversation && conversationBlocks && conversationBlocks.length > 0
    ? `\n💡 EJEMPLO DE INICIO:\n"${conversationBlocks[0].intro_phrase}"\n\n(Luego hacer las preguntas del Bloque 1)`
    : `\n💡 EJEMPLO DE INICIO:\n"¡Hola! Soy tu asistente legal especializado en ${legalAgent.document_name}. Te voy a ayudar a recopilar toda la información necesaria para crear tu documento de manera rápida y eficiente.\n\nEste documento es importante porque [explicar brevemente]. Para poder crearlo correctamente, necesitaré algunos datos específicos.\n\n¿Podrías comenzar diciéndome [primera pregunta]?"`
}


¡Tu trabajo es hacer el proceso fácil, claro y profesional, asegurando que toda la información esté correctamente normalizada según los estándares colombianos!
`;
}
