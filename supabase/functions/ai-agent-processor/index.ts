import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const securityHeaders = {
  ...corsHeaders,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// Helper function to get system configuration
async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    console.log(`🔧 Fetching config: ${configKey}`);
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle();

    if (error) {
      console.error(`❌ Error fetching config ${configKey}:`, error);
      return defaultValue || '';
    }

    const value = data?.config_value || defaultValue || '';
    console.log(`✅ Config ${configKey}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
    return value;
  } catch (error) {
    console.error(`❌ Exception fetching config ${configKey}:`, error);
    return defaultValue || '';
  }
}

// Helper function to extract placeholders from template
function extractPlaceholders(docTemplate: string) {
  console.log('🔍 Extracting placeholders from template...');
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const placeholders = [];
  const found = new Set(); // Para evitar duplicados
  let match;
  
  while ((match = placeholderRegex.exec(docTemplate)) !== null) {
    const fieldName = match[1].trim();
    if (!found.has(fieldName)) {
      found.add(fieldName);
      placeholders.push({
        field: fieldName,
        label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: 'text',
        required: true,
        description: `Ingrese ${fieldName.toLowerCase().replace(/_/g, ' ')}`
      });
    }
  }
  
  console.log(`✅ Found ${placeholders.length} unique placeholders`);
  return placeholders;
}

// Helper function to call OpenAI API
async function callOpenAI(apiKey: string, model: string, messages: any[], temperature = 0.7, maxTokens = 1000) {
  console.log(`🤖 Calling OpenAI API with model: ${model}`);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ OpenAI API error (${response.status}):`, errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`✅ OpenAI API response received`);
  return data;
}

// Helper function to generate system prompt from conversation blocks
function generateSystemPrompt(docName: string, targetAudience: string, conversationBlocks: any[], fieldInstructions: any[], baseDNA: string) {
  console.log('🔧 Generating system prompt from conversation blocks...');
  
  // Build conversation structure section
  const conversationStructure = conversationBlocks
    .sort((a, b) => a.blockOrder - b.blockOrder)
    .map((block, index) => {
      const placeholdersList = block.placeholders.map((p: string) => `    * {{${p}}}`).join('\n');
      return `
### BLOQUE ${index + 1}: ${block.blockName}
**Frase de Introducción:** "${block.introPhrase}"
**Información a Recopilar:**
${placeholdersList}`;
    }).join('\n');

  // Build field-specific instructions
  const fieldSpecificInstructions = fieldInstructions.length > 0 ? `

## INSTRUCCIONES ESPECÍFICAS POR CAMPO

${fieldInstructions.map(instruction => `
**Para el campo \`${instruction.fieldName}\`:**
${instruction.validationRule ? `* **Validación:** ${instruction.validationRule}` : ''}
${instruction.helpText ? `* **Ayuda:** ${instruction.helpText}` : ''}
`).join('')}` : '';

  // Generate complete system prompt
  const systemPrompt = `${baseDNA}

## INFORMACIÓN DEL DOCUMENTO
- **Documento:** ${docName}
- **Audiencia Objetivo:** ${targetAudience}

## ESTRUCTURA DE RECOPILACIÓN DE INFORMACIÓN (OBLIGATORIA)
${conversationStructure}
${fieldSpecificInstructions}

## PROTOCOLO DE EJECUCIÓN
1. **Saludo Inicial:** Preséntate como Lexi y explica brevemente qué documento van a crear juntos
2. **Recopilación por Bloques:** Sigue EXACTAMENTE el orden de los bloques definidos arriba
3. **Validación por Bloque:** Al completar cada bloque, confirma la información antes de continuar
4. **Resumen Final:** Al terminar todos los bloques, presenta un resumen completo para confirmación
5. **Generación:** Solo procede a generar el documento cuando toda la información esté confirmada`;

  console.log(`✅ System prompt generated (${systemPrompt.length} characters)`);
  return systemPrompt;
}

serve(async (req) => {
  console.log('🎯 === AI-AGENT-PROCESSOR FUNCTION STARTED ===', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Method not allowed' 
    }), {
      status: 405,
      headers: securityHeaders
    });
  }

  try {
    // Get environment variables
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    console.log('🔑 Environment check:', {
      hasOpenAI: !!openAIApiKey,
      hasSupabaseKey: !!supabaseServiceKey,
      hasSupabaseUrl: !!supabaseUrl
    });

    if (!openAIApiKey) {
      console.error('❌ Missing OpenAI API key');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      }), {
        status: 500,
        headers: securityHeaders
      });
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    console.log('✅ Supabase client initialized');

    // Parse request body
    const body = await req.json();
    console.log('📥 Request received:', {
      hasDocName: !!body.docName,
      hasDocTemplate: !!body.docTemplate,
      category: body.category,
      targetAudience: body.targetAudience,
      conversationBlocksCount: body.conversationBlocks?.length || 0,
      fieldInstructionsCount: body.fieldInstructions?.length || 0
    });

    const { docName, docDesc, category, docTemplate, targetAudience, conversationBlocks = [], fieldInstructions = [] } = body;

    // Validate required fields
    if (!docName || !docTemplate) {
      console.log('❌ Missing required fields');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required fields: docName and docTemplate' 
      }), {
        status: 400,
        headers: securityHeaders
      });
    }

    // Step 1: Get system configuration from database
    console.log('⚙️ === STEP 1: FETCHING SYSTEM CONFIGURATION ===');
    const model = await getSystemConfig(supabase, 'agent_creation_ai_model', 'gpt-4.1-2025-04-14');
    const baseDNA = await getSystemConfig(supabase, 'agent_creation_system_prompt', 
      `## ROL Y OBJETIVO
Eres "Lexi-Guía", un asistente de IA experto en la creación de documentos legales en Colombia. Tu misión es guiar al usuario de manera amigable, segura y profesional para recopilar toda la información necesaria.

## TONO Y ESTILO DE CONVERSACIÓN
* **Saludo Inicial:** Comienza siempre con: "¡Hola! Soy Lexi, tu asistente legal. Juntos vamos a crear tu documento paso a paso. No te preocupes, me aseguraré de que toda la información sea correcta..."
* **Tono:** Profesional pero cercano, como un abogado de confianza
* **Explicaciones:** Siempre explica brevemente por qué necesitas cada información
* **Paciencia:** Si el usuario no entiende algo, explícalo de manera más simple
* **Validación:** Confirma cada respuesta importante antes de continuar

## REGLAS DE FORMATEO Y VALIDACIÓN DE DATOS
* **Nombres y lugares:** Siempre en formato de título (Primera Letra Mayúscula)
* **Números de identificación:** Sin puntos ni espacios, solo números
* **Direcciones:** Formato estándar colombiano
* **Dinero:** Sin símbolos ni puntos, solo números (ej: 1500000)
* **Fechas:** Formato DD/MM/AAAA

## CONFIDENCIALIDAD Y REVISIÓN
* Recuerda al usuario que toda la información es confidencial
* Al final, menciona: "Un abogado humano revisará el documento antes de la entrega final para garantizar su precisión legal"`
    );

    console.log('✅ System configuration loaded successfully');

    // Step 2: Extract placeholders from template
    console.log('⚙️ === STEP 2: EXTRACTING PLACEHOLDERS ===');
    const placeholders = extractPlaceholders(docTemplate);

    // Step 3: Generate enhanced prompt using conversation blocks
    console.log('⚙️ === STEP 3: GENERATING SYSTEM PROMPT ===');
    
    let enhancedPrompt = '';
    
    if (conversationBlocks.length > 0) {
      // Generate system prompt from conversation blocks
      enhancedPrompt = generateSystemPrompt(docName, targetAudience, conversationBlocks, fieldInstructions, baseDNA);
    } else {
      // Fallback: generate basic structure from placeholders
      console.log('⚠️ No conversation blocks provided, generating fallback structure...');
      
      const fallbackBlocks = [{
        blockName: 'Información General',
        introPhrase: 'Empecemos recopilando la información principal para tu documento.',
        placeholders: placeholders.map(p => p.field),
        blockOrder: 1
      }];
      
      enhancedPrompt = generateSystemPrompt(docName, targetAudience, fallbackBlocks, fieldInstructions, baseDNA);
    }

    // Step 4: Generate intelligent price suggestion
    console.log('⚙️ === STEP 4: GENERATING PRICE ANALYSIS ===');
    
    let suggestedPrice = 35000; // Default fallback
    let priceJustification = 'Precio base estimado';
    
    try {
      const priceMessages = [
        {
          role: 'system',
          content: 'Eres un experto en precios de servicios legales en Colombia. Analiza la complejidad del documento y sugiere un precio justo en pesos colombianos.'
        },
        {
          role: 'user',
          content: `Analiza este documento legal y sugiere un precio justo en COP:

DOCUMENTO: ${docName}
CATEGORÍA: ${category}
DESCRIPCIÓN: ${docDesc || 'No disponible'}
CAMPOS REQUERIDOS: ${placeholders.length}
BLOQUES DE CONVERSACIÓN: ${conversationBlocks.length}
AUDIENCIA: ${targetAudience}
COMPLEJIDAD ESTIMADA: ${placeholders.length > 15 ? 'Alta' : placeholders.length > 8 ? 'Media' : 'Baja'}

CAMPOS ESPECÍFICOS:
${placeholders.map(p => `- ${p.label}`).join('\n')}

Considera:
- Tiempo de recopilación de información
- Complejidad legal del documento
- Validaciones requeridas
- Mercado colombiano actual
- Audiencia objetivo (${targetAudience})

Responde ÚNICAMENTE con el número del precio sin formato (ejemplo: 45000).`
        }
      ];

      const priceResponse = await callOpenAI(openAIApiKey, model, priceMessages, 0.3, 100);
      const priceText = priceResponse.choices[0]?.message?.content || '';
      const extractedPrice = parseInt(priceText.replace(/\D/g, '')) || 35000;
      
      // Validar que el precio esté en un rango razonable
      if (extractedPrice >= 15000 && extractedPrice <= 500000) {
        suggestedPrice = extractedPrice;
        priceJustification = `Precio calculado por IA considerando:
• Complejidad: ${placeholders.length} campos requeridos
• Bloques de conversación: ${conversationBlocks.length}
• Categoría legal: ${category}
• Audiencia: ${targetAudience}
• Análisis de mercado colombiano`;
      } else {
        // Usar cálculo de fallback
        const basePrice = 25000;
        const complexityMultiplier = Math.min(placeholders.length * 0.8 + 1, 4);
        const categoryMultiplier = category === 'Comercial' ? 1.3 : category === 'Societario' ? 1.5 : 1;
        const audienceMultiplier = targetAudience === 'empresas' ? 1.4 : 1;
        
        suggestedPrice = Math.round(basePrice * complexityMultiplier * categoryMultiplier * audienceMultiplier);
        priceJustification = `Precio calculado con algoritmo de respaldo:
• Base: $${basePrice.toLocaleString()} COP
• Complejidad (${placeholders.length} campos): ${complexityMultiplier}x
• Categoría ${category}: ${categoryMultiplier}x
• Audiencia ${targetAudience}: ${audienceMultiplier}x`;
      }
      
      console.log(`✅ Price analysis completed: $${suggestedPrice.toLocaleString()} COP`);
      
    } catch (priceError) {
      console.error('⚠️ Error generating price with AI:', priceError);
      console.log('🔄 Using fallback pricing algorithm...');
      
      // Fallback pricing algorithm
      const basePrice = 25000;
      const complexityMultiplier = Math.min(placeholders.length * 0.8 + 1, 4);
      const categoryMultiplier = category === 'Comercial' ? 1.3 : category === 'Societario' ? 1.5 : 1;
      const audienceMultiplier = targetAudience === 'empresas' ? 1.4 : 1;
      
      suggestedPrice = Math.round(basePrice * complexityMultiplier * categoryMultiplier * audienceMultiplier);
      priceJustification = `Precio calculado con algoritmo estándar:
• Complejidad del documento: ${placeholders.length} campos
• Categoría: ${category}
• Audiencia: ${targetAudience}`;
    }

    // Step 5: Build final response
    console.log('⚙️ === STEP 5: BUILDING RESPONSE ===');
    
    const response = {
      success: true,
      enhancedPrompt,
      placeholders,
      suggestedPrice: `$ ${suggestedPrice.toLocaleString()} COP`,
      priceJustification,
      model,
      processingDetails: {
        placeholdersFound: placeholders.length,
        conversationBlocksProcessed: conversationBlocks.length,
        fieldInstructionsProcessed: fieldInstructions.length,
        promptLength: enhancedPrompt.length,
        configModel: model,
        timestamp: new Date().toISOString()
      }
    };

    console.log('✅ === PROCESSING COMPLETED SUCCESSFULLY ===', {
      placeholdersCount: placeholders.length,
      conversationBlocksCount: conversationBlocks.length,
      fieldInstructionsCount: fieldInstructions.length,
      enhancedPromptLength: enhancedPrompt.length,
      suggestedPrice: response.suggestedPrice,
      model: model
    });

    return new Response(JSON.stringify(response), {
      headers: securityHeaders
    });

  } catch (error) {
    console.error('💥 === FATAL ERROR IN AI AGENT PROCESSOR ===', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: securityHeaders
    });
  }
});