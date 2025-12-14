import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { 
  buildResponsesRequestParams, 
  callResponsesAPI, 
  logResponsesRequest 
} from "../_shared/openai-responses-utils.ts";

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
  console.log('🎯 === PROCESS-AGENT-AI FUNCTION STARTED (Responses API) ===', {
    timestamp: new Date().toISOString(),
    method: req.method
  });
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: securityHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    if (!supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestBody = await req.json();

    const { docName, docDesc, docCat, docTemplate, initialPrompt, targetAudience } = requestBody;

    if (!docName || !docTemplate) {
      return new Response(JSON.stringify({ error: 'Missing required fields: docName and docTemplate' }), {
        status: 400,
        headers: securityHeaders
      });
    }

    // Get configured OpenAI model and prompts
    const selectedModel = await getSystemConfig(supabase, 'agent_creation_ai_model', 'gpt-4o-mini');
    // Instrucciones del procesador (reglas estrictas para formato de respuesta)
    const processorInstructions = await getSystemConfig(supabase, 'agent_prompt_processor_instructions', null);
    // ADN base del agente (comportamiento y personalidad)
    const baseDNA = await getSystemConfig(supabase, 'agent_creation_system_prompt', null);

    logResponsesRequest(selectedModel, 'process-agent-ai', true);

    // 1. Enhance the initial prompt using Responses API
    if (!processorInstructions) {
      console.error('❌ agent_prompt_processor_instructions not configured in system_config');
      return new Response(JSON.stringify({ 
        error: 'Configuración faltante: agent_prompt_processor_instructions no está configurado en el sistema' 
      }), { status: 500, headers: securityHeaders });
    }

    const enhanceInstructions = `${processorInstructions}

PÚBLICO OBJETIVO: ${targetAudience === 'empresas' ? 'Empresas y clientes corporativos' : 'Personas (clientes individuales)'}
${targetAudience === 'empresas' ? 'Enfócate en terminología corporativa y considera aspectos empresariales específicos.' : 'Usa lenguaje claro y accesible para personas naturales.'}

${baseDNA ? `USA ESTE ADN BASE COMO GUÍA DE COMPORTAMIENTO PARA EL AGENTE:
${baseDNA}` : ''}`;

    const enhanceInput = `Mejora este prompt para un agente que ayuda a crear: "${docName}"

Categoría: ${docCat}
Descripción: ${docDesc}
Público objetivo: ${targetAudience === 'empresas' ? 'Empresas' : 'Personas'}

Prompt inicial del abogado:
${initialPrompt}

Plantilla del documento:
${docTemplate}`;

    const enhanceParams = buildResponsesRequestParams(selectedModel, {
      input: enhanceInput,
      instructions: enhanceInstructions,
      maxOutputTokens: 4000,
      temperature: 0.3,
      store: false,
      reasoning: { effort: 'low' } // Simple task - minimize reasoning tokens
    });

    const enhanceResult = await callResponsesAPI(openAIApiKey, enhanceParams);
    
    if (!enhanceResult.success) {
      throw new Error(`Failed to enhance prompt: ${enhanceResult.error}`);
    }

    const enhancedPrompt = enhanceResult.text || '';
    console.log('✅ Prompt enhancement completed');

    // 2. Extract placeholders from template using Responses API
    const extractInstructions = `Eres un experto en análisis de documentos legales. Tu trabajo es identificar todos los placeholders (variables) en una plantilla de documento y generar preguntas claras para recopilar esa información del usuario.

PÚBLICO OBJETIVO: ${targetAudience === 'empresas' ? 'Empresas y clientes corporativos' : 'Personas (clientes individuales)'}

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un array JSON válido de objetos con esta estructura:
[
  {"placeholder": "{{variable_name}}", "pregunta": "Pregunta clara para el usuario", "tipo": "texto|fecha|numero|email|telefono", "requerido": true|false}
]

REGLAS CRÍTICAS:
- Identifica TODOS los placeholders que usan {{}} o similar
- Cada pregunta debe ser clara, específica y en español colombiano
- ${targetAudience === 'empresas' ? 'Adapta las preguntas para contexto empresarial' : 'Usa lenguaje amigable para personas naturales'}
- Clasifica el tipo de dato esperado
- Marca como requerido=true solo campos esenciales
- No incluyas texto adicional, solo el array JSON`;

    const extractInput = `Analiza esta plantilla de documento legal y extrae todos los placeholders:

DOCUMENTO: ${docName}
PÚBLICO OBJETIVO: ${targetAudience === 'empresas' ? 'Empresas' : 'Personas'}
PLANTILLA:
${docTemplate}`;

    const extractParams = buildResponsesRequestParams(selectedModel, {
      input: extractInput,
      instructions: extractInstructions,
      maxOutputTokens: 3000,
      temperature: 0.1,
      jsonMode: true,
      store: false,
      reasoning: { effort: 'low' } // Simple task - minimize reasoning tokens
    });

    const extractResult = await callResponsesAPI(openAIApiKey, extractParams);
    
    let extractedPlaceholders = [];
    
    if (extractResult.success && extractResult.text) {
      try {
        extractedPlaceholders = JSON.parse(extractResult.text);
        
        // Validate that all placeholders in template are captured
        const templatePlaceholderRegex = /\{\{([^}]+)\}\}/g;
        const templatePlaceholders = [...docTemplate.matchAll(templatePlaceholderRegex)];
        const extractedPlaceholderNames = extractedPlaceholders.map((p: any) => p.placeholder);
        
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
        // Fallback extraction
        const patterns = [/\{\{([^}]+)\}\}/g, /\{([^}]+)\}/g, /\[([^\]]+)\]/g];
        
        for (const pattern of patterns) {
          const matches = [...docTemplate.matchAll(pattern)];
          for (const match of matches) {
            if (!extractedPlaceholders.some((p: any) => p.placeholder === match[0])) {
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
    }

    console.log('✅ Placeholder extraction completed:', extractedPlaceholders.length, 'placeholders');

    return new Response(JSON.stringify({
      success: true,
      enhancedPrompt,
      extractedPlaceholders,
      suggestedPrice: null,
      priceJustification: null
    }), {
      headers: securityHeaders
    });

  } catch (error) {
    console.error('❌ AI processing error:', error);
    return new Response(JSON.stringify({ 
      error: 'Error procesando con IA',
      details: error.message 
    }), {
      status: 500,
      headers: securityHeaders
    });
  }
});
