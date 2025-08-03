import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const securityHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Helper function to get system configuration
async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .single();

    if (error || !data) {
      console.log(`Config ${configKey} not found, using default: ${defaultValue || 'none'}`);
      return defaultValue || '';
    }

    return data.config_value;
  } catch (error) {
    console.error(`Error fetching config ${configKey}:`, error);
    return defaultValue || '';
  }
}

serve(async (req) => {
  console.log('🎯 === PROCESS-AGENT-AI FUNCTION STARTED ===', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return new Response('Method not allowed', { status: 405, headers: securityHeaders });
  }

  console.log('🚀 Processing POST request...');

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    console.log('Environment check:', {
      hasOpenAIKey: !!openAIApiKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseServiceKey
    });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    if (!supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration');
    }

    console.log('Initializing Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await req.json();
    console.log('Request body received:', {
      docName: requestBody.docName,
      docDesc: requestBody.docDesc?.substring(0, 100) + '...',
      docCat: requestBody.docCat,
      templateLength: requestBody.docTemplate?.length,
      promptLength: requestBody.initialPrompt?.length,
      targetAudience: requestBody.targetAudience
    });

    const { docName, docDesc, docCat, docTemplate, initialPrompt, targetAudience } = requestBody;

    console.log('Validating required fields:', {
      docName: !!docName,
      docTemplate: !!docTemplate,
      initialPrompt: initialPrompt?.length || 0
    });

    if (!docName || !docTemplate) {
      console.log('❌ Missing required fields - docName or docTemplate');
      return new Response(JSON.stringify({ error: 'Missing required fields: docName and docTemplate' }), {
        status: 400,
        headers: securityHeaders
      });
    }

    console.log('Fetching system configuration...');

    // Get configured OpenAI model and prompt for agent creation
    const selectedModel = await getSystemConfig(supabase, 'agent_creation_ai_model', 'gpt-4o-mini');
    const customSystemPrompt = await getSystemConfig(supabase, 'agent_creation_system_prompt', null);

    console.log('Using configured model:', selectedModel);
    console.log('Using configured system prompt:', !!customSystemPrompt);

    console.log('Making OpenAI API request for prompt enhancement...');

    // 1. Enhance the initial prompt
    const enhancePromptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: customSystemPrompt || `Eres un experto en crear prompts para asistentes legales de IA. Tu trabajo es mejorar prompts básicos y convertirlos en instrucciones claras, profesionales y efectivas para agentes de IA que ayudan a crear documentos legales en Colombia.

PÚBLICO OBJETIVO: ${targetAudience === 'empresas' ? 'Empresas y clientes corporativos' : 'Personas (clientes individuales)'}

REGLAS IMPORTANTES:
1. RESPONDE ÚNICAMENTE CON EL PROMPT MEJORADO EN TEXTO PLANO
2. NO incluyas explicaciones, comentarios, ni texto adicional
3. NO uses estructura markdown (##, **, _, etc.)
4. NO incluyas encabezados, títulos o secciones explicativas
5. El prompt debe ser directo y profesional
6. Mantén el contexto legal colombiano
7. Asegúrate de que sea claro y actionable
8. NO uses caracteres especiales de markdown
9. ${targetAudience === 'empresas' ? 'Enfócate en terminología corporativa y considera aspectos empresariales específicos' : 'Usa lenguaje claro y accesible para personas naturales'}

OBJETIVO: Devolver únicamente el prompt mejorado en texto plano, adaptado para ${targetAudience === 'empresas' ? 'empresas' : 'personas naturales'}, sin formato adicional.`
          },
          {
            role: 'user',
            content: `Mejora este prompt para un agente que ayuda a crear: "${docName}"

Categoría: ${docCat}
Descripción: ${docDesc}
Público objetivo: ${targetAudience === 'empresas' ? 'Empresas' : 'Personas'}

Prompt inicial del abogado:
${initialPrompt}

Plantilla del documento:
${docTemplate}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    console.log('OpenAI prompt enhancement response status:', enhancePromptResponse.status);

    if (!enhancePromptResponse.ok) {
      throw new Error(`OpenAI API error for prompt enhancement: ${enhancePromptResponse.status}`);
    }

    const enhancedPromptData = await enhancePromptResponse.json();
    console.log('Prompt enhancement completed');
    const enhancedPrompt = enhancedPromptData.choices[0].message.content;

    console.log('Making OpenAI API request for placeholder extraction...');

    // 2. Extract placeholders from template with validation
    const extractPlaceholdersResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: `Eres un experto en análisis de documentos legales. Tu trabajo es identificar todos los placeholders (variables) en una plantilla de documento y generar preguntas claras para recopilar esa información del usuario.

PÚBLICO OBJETIVO: ${targetAudience === 'empresas' ? 'Empresas y clientes corporativos' : 'Personas (clientes individuales)'}

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un array JSON válido de objetos con esta estructura:
[
  {"placeholder": "{{variable_name}}", "pregunta": "Pregunta clara para el usuario", "tipo": "texto|fecha|numero|email|telefono", "requerido": true|false},
  {"placeholder": "{{otra_variable}}", "pregunta": "Otra pregunta clara", "tipo": "texto", "requerido": true}
]

REGLAS CRÍTICAS:
- Identifica TODOS los placeholders que usan {{}} o similar ({{NOMBRE}}, {{FECHA}}, etc.)
- Cada pregunta debe ser clara, específica y en español colombiano
- Las preguntas deben ser profesionales pero amigables
- ${targetAudience === 'empresas' ? 'Adapta las preguntas para contexto empresarial (razón social, NIT, representante legal, etc.)' : 'Usa lenguaje amigable para personas naturales (nombre completo, cédula, dirección personal, etc.)'}
- Clasifica el tipo de dato esperado (texto, fecha, numero, email, telefono)
- Marca como requerido=true solo campos esenciales para el documento
- VALIDACIÓN: Asegúrate de que cada placeholder en la plantilla tenga su pregunta correspondiente
- No incluyas texto adicional, solo el array JSON`
          },
          {
            role: 'user',
            content: `Analiza esta plantilla de documento legal y extrae todos los placeholders con sus preguntas correspondientes:

DOCUMENTO: ${docName}
PÚBLICO OBJETIVO: ${targetAudience === 'empresas' ? 'Empresas' : 'Personas'}
PLANTILLA:
${docTemplate}

IMPORTANTE: Verifica que identificas TODOS los placeholders presentes en la plantilla. Busca patrones como {{ALGO}}, {ALGO}, [ALGO], etc.`
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    console.log('OpenAI placeholder extraction response status:', extractPlaceholdersResponse.status);

    if (!extractPlaceholdersResponse.ok) {
      throw new Error(`OpenAI API error for placeholder extraction: ${extractPlaceholdersResponse.status}`);
    }

    const placeholdersData = await extractPlaceholdersResponse.json();
    console.log('Placeholder extraction completed');
    let extractedPlaceholders = [];
    
    try {
      extractedPlaceholders = JSON.parse(placeholdersData.choices[0].message.content);
      
      // Validate that all placeholders in template are captured
      const templatePlaceholderRegex = /\{\{([^}]+)\}\}/g;
      const templatePlaceholders = [...docTemplate.matchAll(templatePlaceholderRegex)];
      const extractedPlaceholderNames = extractedPlaceholders.map(p => p.placeholder);
      
      // Add any missing placeholders
      for (const match of templatePlaceholders) {
        if (!extractedPlaceholderNames.includes(match[0])) {
          console.warn(`Missing placeholder detected: ${match[0]}`);
          extractedPlaceholders.push({
            placeholder: match[0],
            pregunta: `¿Cuál es el valor para ${match[1].replace(/_/g, ' ')}?`,
            tipo: 'texto',
            requerido: true
          });
        }
      }
      
    } catch (error) {
      console.error('Error parsing placeholders:', error);
      // Enhanced fallback: extract placeholders using multiple patterns
      const patterns = [
        /\{\{([^}]+)\}\}/g,  // {{PLACEHOLDER}}
        /\{([^}]+)\}/g,      // {PLACEHOLDER}
        /\[([^\]]+)\]/g      // [PLACEHOLDER]
      ];
      
      extractedPlaceholders = [];
      for (const pattern of patterns) {
        const matches = [...docTemplate.matchAll(pattern)];
        for (const match of matches) {
          if (!extractedPlaceholders.some(p => p.placeholder === match[0])) {
            extractedPlaceholders.push({
              placeholder: match[0],
              pregunta: `¿Cuál es el valor para ${match[1].replace(/_/g, ' ')}?`,
              tipo: 'texto',
              requerido: true
            });
          }
        }
      }
    }

    console.log('Making OpenAI API request for price analysis...');

    // 3. Calculate suggested price based on complexity
    const priceAnalysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: `Eres un experto en pricing de servicios legales en Colombia. Tu trabajo es analizar la complejidad de un documento legal y sugerir un precio justo en pesos colombianos.

PÚBLICO OBJETIVO: ${targetAudience === 'empresas' ? 'Empresas y clientes corporativos' : 'Personas (clientes individuales)'}

FACTORES A CONSIDERAR:
- Número de variables/campos a completar
- Complejidad legal del documento
- Tiempo estimado de procesamiento
- Valor de mercado en Colombia para ${targetAudience === 'empresas' ? 'servicios corporativos' : 'servicios a personas'}
- Categoría del documento
- ${targetAudience === 'empresas' ? 'Valor agregado empresarial y riesgo corporativo' : 'Accesibilidad para personas naturales'}

RANGOS DE PRECIOS CONSERVADORES PARA ELABORACIÓN (${targetAudience === 'empresas' ? 'EMPRESAS' : 'PERSONAS'}):
${targetAudience === 'empresas' ? `
- Documentos simples (1-5 variables): $25,000 - $50,000 COP
- Documentos moderados (6-15 variables): $50,000 - $120,000 COP  
- Documentos complejos (16+ variables): $120,000 - $250,000 COP
- Documentos muy complejos (societarios, etc.): $250,000 - $400,000 COP
` : `
- Documentos simples (1-5 variables): $15,000 - $30,000 COP
- Documentos moderados (6-15 variables): $30,000 - $70,000 COP  
- Documentos complejos (16+ variables): $70,000 - $150,000 COP
- Documentos muy complejos (societarios, etc.): $150,000 - $250,000 COP
`}

NOTA: Estos son precios conservadores para la elaboración del documento, no el precio final al cliente.

FORMATO DE RESPUESTA:
{
  "precio_sugerido": "$ 85,000 COP",
  "justificacion": "Explicación detallada del precio basada en los factores analizados para ${targetAudience === 'empresas' ? 'empresas' : 'personas'}"
}`
          },
          {
            role: 'user',
            content: `Analiza este documento legal y sugiere un precio:

DOCUMENTO: ${docName}
CATEGORÍA: ${docCat}
DESCRIPCIÓN: ${docDesc}
PÚBLICO OBJETIVO: ${targetAudience === 'empresas' ? 'Empresas' : 'Personas'}
NÚMERO DE VARIABLES: ${extractedPlaceholders.length}

PLANTILLA:
${docTemplate.substring(0, 1000)}${docTemplate.length > 1000 ? '...' : ''}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    console.log('OpenAI price analysis response status:', priceAnalysisResponse.status);

    if (!priceAnalysisResponse.ok) {
      throw new Error(`OpenAI API error for price analysis: ${priceAnalysisResponse.status}`);
    }

    const priceData = await priceAnalysisResponse.json();
    console.log('Price analysis completed');
    let priceAnalysis;
    
    try {
      priceAnalysis = JSON.parse(priceData.choices[0].message.content);
    } catch (error) {
      console.error('Error parsing price analysis:', error);
      // Fallback pricing logic - more conservative and audience-aware
      const baseMultiplier = targetAudience === 'empresas' ? 8000 : 5000;
      const minPrice = targetAudience === 'empresas' ? 25000 : 15000;
      const maxPrice = targetAudience === 'empresas' ? 400000 : 250000;
      
      const basePrice = Math.min(Math.max(extractedPlaceholders.length * baseMultiplier, minPrice), maxPrice);
      priceAnalysis = {
        precio_sugerido: `$ ${basePrice.toLocaleString()} COP`,
        justificacion: `Precio conservador de elaboración basado en ${extractedPlaceholders.length} variables identificadas y complejidad del documento para ${targetAudience === 'empresas' ? 'empresas' : 'personas naturales'}.`
      };
    }

    // Log successful processing
    console.log(`AI processing completed for document: ${docName}`);
    console.log(`- Enhanced prompt length: ${enhancedPrompt.length} chars`);
    console.log(`- Placeholders extracted: ${extractedPlaceholders.length}`);
    console.log(`- Suggested price: ${priceAnalysis.precio_sugerido}`);

    return new Response(JSON.stringify({
      success: true,
      enhancedPrompt,
      extractedPlaceholders,
      suggestedPrice: priceAnalysis.precio_sugerido,
      priceJustification: priceAnalysis.justificacion
    }), {
      headers: securityHeaders
    });

  } catch (error) {
    console.error('AI processing error:', error);
    return new Response(JSON.stringify({ 
      error: 'Error procesando con IA',
      details: error.message 
    }), {
      status: 500,
      headers: securityHeaders
    });
  }
});