import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: securityHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { docName, docDesc, docCat, docTemplate, initialPrompt } = await req.json();

    if (!docName || !docTemplate || !initialPrompt) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: securityHeaders
      });
    }

    // 1. Enhance the initial prompt
    const enhancePromptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en crear prompts para asistentes legales de IA. Tu trabajo es mejorar prompts básicos y convertirlos en instrucciones claras, profesionales y efectivas para agentes de IA que ayudan a crear documentos legales en Colombia.

ESTRUCTURA REQUERIDA:
## ROL Y OBJETIVO
[Define claramente el rol del asistente y su objetivo específico]

## PROCESO DE RECOPILACIÓN
[Explica cómo debe recopilar información del usuario de forma secuencial]

## CAMPOS A RECOPILAR
[Lista específica de la información necesaria basada en la plantilla]

## ESTILO DE CONVERSACIÓN
[Tono profesional pero amigable, validaciones, etc.]

## PROCESO DE REDACCIÓN
[Cómo debe generar el documento final]

## INSTRUCCIONES DE HERRAMIENTAS
[Cómo usar las herramientas disponibles]

## FINALIZACIÓN
[Cómo terminar el proceso exitosamente]

Mejora el prompt manteniendo el contexto legal colombiano y asegurando que sea claro y actionable.`
          },
          {
            role: 'user',
            content: `Mejora este prompt para un agente que ayuda a crear: "${docName}"

Categoría: ${docCat}
Descripción: ${docDesc}

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

    const enhancedPromptData = await enhancePromptResponse.json();
    const enhancedPrompt = enhancedPromptData.choices[0].message.content;

    // 2. Extract placeholders from template
    const extractPlaceholdersResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en análisis de documentos legales. Tu trabajo es identificar todos los placeholders (variables) en una plantilla de documento y generar preguntas claras para recopilar esa información del usuario.

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un array JSON válido de objetos con esta estructura:
[
  {"placeholder": "{{variable_name}}", "pregunta": "Pregunta clara para el usuario"},
  {"placeholder": "{{otra_variable}}", "pregunta": "Otra pregunta clara"}
]

REGLAS:
- Identifica TODOS los placeholders que usan {{}} o similar
- Cada pregunta debe ser clara, específica y en español colombiano
- Las preguntas deben ser profesionales pero amigables
- No incluyas texto adicional, solo el array JSON`
          },
          {
            role: 'user',
            content: `Analiza esta plantilla de documento legal y extrae todos los placeholders con sus preguntas correspondientes:

DOCUMENTO: ${docName}
PLANTILLA:
${docTemplate}`
          }
        ],
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    const placeholdersData = await extractPlaceholdersResponse.json();
    let extractedPlaceholders = [];
    
    try {
      extractedPlaceholders = JSON.parse(placeholdersData.choices[0].message.content);
    } catch (error) {
      console.error('Error parsing placeholders:', error);
      // Fallback: extract placeholders using regex
      const placeholderRegex = /\{\{([^}]+)\}\}/g;
      const matches = [...docTemplate.matchAll(placeholderRegex)];
      extractedPlaceholders = matches.map(match => ({
        placeholder: match[0],
        pregunta: `¿Cuál es el valor para ${match[1].replace(/_/g, ' ')}?`
      }));
    }

    // 3. Calculate suggested price based on complexity
    const priceAnalysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en pricing de servicios legales en Colombia. Tu trabajo es analizar la complejidad de un documento legal y sugerir un precio justo en pesos colombianos.

FACTORES A CONSIDERAR:
- Número de variables/campos a completar
- Complejidad legal del documento
- Tiempo estimado de procesamiento
- Valor de mercado en Colombia
- Categoría del documento

RANGOS DE PRECIOS TÍPICOS EN COLOMBIA:
- Documentos simples (1-5 variables): $25,000 - $50,000 COP
- Documentos moderados (6-15 variables): $50,000 - $120,000 COP  
- Documentos complejos (16+ variables): $120,000 - $300,000 COP
- Documentos muy complejos (societarios, etc.): $300,000+ COP

FORMATO DE RESPUESTA:
{
  "precio_sugerido": "$ 85,000 COP",
  "justificacion": "Explicación detallada del precio basada en los factores analizados"
}`
          },
          {
            role: 'user',
            content: `Analiza este documento legal y sugiere un precio:

DOCUMENTO: ${docName}
CATEGORÍA: ${docCat}
DESCRIPCIÓN: ${docDesc}
NÚMERO DE VARIABLES: ${extractedPlaceholders.length}

PLANTILLA:
${docTemplate.substring(0, 1000)}${docTemplate.length > 1000 ? '...' : ''}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    const priceData = await priceAnalysisResponse.json();
    let priceAnalysis;
    
    try {
      priceAnalysis = JSON.parse(priceData.choices[0].message.content);
    } catch (error) {
      console.error('Error parsing price analysis:', error);
      // Fallback pricing logic
      const basePrice = Math.min(Math.max(extractedPlaceholders.length * 8000, 25000), 300000);
      priceAnalysis = {
        precio_sugerido: `$ ${basePrice.toLocaleString()} COP`,
        justificacion: `Precio basado en ${extractedPlaceholders.length} variables identificadas y complejidad del documento.`
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