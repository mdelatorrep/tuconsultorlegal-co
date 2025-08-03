import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
      initialPromptLength: body.initialPrompt?.length || 0
    });

    const { docName, docDesc, category, docTemplate, initialPrompt, targetAudience } = body;

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
    const model = await getSystemConfig(supabase, 'agent_creation_ai_model', 'gpt-4o-mini');
    const systemPrompt = await getSystemConfig(supabase, 'agent_creation_system_prompt', 
      'Eres un asistente legal experto en Colombia. Tu tarea es analizar documentos legales y mejorar prompts para agentes conversacionales.'
    );

    console.log('✅ System configuration loaded successfully');

    // Step 2: Extract placeholders from template
    console.log('⚙️ === STEP 2: EXTRACTING PLACEHOLDERS ===');
    const placeholders = extractPlaceholders(docTemplate);

    // Step 3: Enhance prompt using OpenAI
    console.log('⚙️ === STEP 3: ENHANCING PROMPT WITH AI ===');
    
    let enhancedPrompt = initialPrompt || '';
    
    try {
      const promptMessages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Necesito que mejores el siguiente prompt para un agente conversacional que recopila información para generar documentos legales:

INFORMACIÓN DEL DOCUMENTO:
- Nombre: ${docName}
- Descripción: ${docDesc || 'Documento legal'}
- Categoría: ${category}
- Audiencia objetivo: ${targetAudience}
- Número de campos a recopilar: ${placeholders.length}

PROMPT INICIAL ACTUAL:
${initialPrompt || 'No hay prompt inicial definido'}

CAMPOS QUE DEBE RECOPILAR EL AGENTE:
${placeholders.map(p => `- ${p.label} (${p.field})`).join('\n')}

INSTRUCCIONES:
1. Mejora el prompt para que el agente conversacional sea más efectivo
2. Asegúrate de que siga la estructura de bloques establecida en el system prompt
3. Incluye validaciones específicas para los campos requeridos
4. Mantén el tono profesional pero cercano
5. Devuelve ÚNICAMENTE el prompt mejorado, sin explicaciones adicionales

El prompt debe estar optimizado para ${targetAudience} en Colombia.`
        }
      ];

      const promptResponse = await callOpenAI(openAIApiKey, model, promptMessages, 0.7, 1500);
      enhancedPrompt = promptResponse.choices[0]?.message?.content || initialPrompt || '';
      
      console.log(`✅ Prompt enhanced successfully (${enhancedPrompt.length} characters)`);
      
    } catch (aiError) {
      console.error('⚠️ Error enhancing prompt with AI:', aiError);
      console.log('🔄 Using fallback prompt enhancement...');
      
      // Fallback enhancement
      if (!enhancedPrompt) {
        enhancedPrompt = `Eres Lexi, un asistente legal especializado en la creación de documentos de ${category} en Colombia.

Tu objetivo es recopilar información para generar: ${docName}

INFORMACIÓN A RECOPILAR:
${placeholders.map(p => `• ${p.label}`).join('\n')}

INSTRUCCIONES:
- Mantén un tono profesional pero cercano
- Explica brevemente por qué necesitas cada información
- Recopila los datos por bloques lógicos, no todo de una vez
- Valida y confirma la información antes de continuar
- Al final, genera un resumen completo para confirmación
- Asegúrate de que toda la información cumple con las normas colombianas

Tu audiencia objetivo son: ${targetAudience}`;
      }
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
• Categoría legal: ${category}
• Audiencia: ${targetAudience}
• Análisis de mercado colombiano`;
      } else {
        // Usar cálculo de fallback si el precio de IA está fuera del rango
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
        promptLength: enhancedPrompt.length,
        configModel: model,
        timestamp: new Date().toISOString()
      }
    };

    console.log('✅ === PROCESSING COMPLETED SUCCESSFULLY ===', {
      placeholdersCount: placeholders.length,
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