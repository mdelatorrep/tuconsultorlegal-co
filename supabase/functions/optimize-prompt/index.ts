import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildResponsesRequestParams, callResponsesAPI, extractOutputText } from "../_shared/openai-responses-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Meta Prompt Maestro para optimización de prompts
const DEFAULT_META_PROMPT = `Eres un experto en ingeniería de prompts especializado en aplicaciones legales. Tu tarea es optimizar el siguiente prompt para mejorar su efectividad.

## Contexto de la Plataforma
- Plataforma: tuconsultorlegal.co (servicios legales en Colombia)
- País: Colombia (legislación y terminología legal colombiana)
- Usuarios: Abogados, ciudadanos buscando servicios legales

## Información del Prompt a Optimizar
- Nombre de la función: {{function_name}}
- Descripción: {{function_description}}
- Tipo de output esperado: {{expected_output}}

## Directrices de Optimización

### 1. Claridad y Especificidad
- Usa instrucciones claras y directas
- Evita ambigüedades
- Define términos clave cuando sea necesario

### 2. Estructura
- Organiza con headers y secciones claras
- Usa listas y viñetas para instrucciones múltiples
- Mantén un flujo lógico de instrucciones

### 3. Razonamiento y Pasos
- Fomenta el razonamiento paso a paso antes de conclusiones
- Incluye checkpoints de verificación cuando aplique
- Define orden de prioridades

### 4. Ejemplos
- Incluye ejemplos concretos cuando mejore la comprensión
- Usa formato de entrada/salida cuando sea útil
- Mantén ejemplos relevantes al contexto legal colombiano

### 5. Restricciones y Límites
- Define claramente qué NO debe hacer el modelo
- Establece límites de alcance
- Previene respuestas fuera de contexto

### 6. Formato de Output
- Especifica exactamente el formato esperado
- Define estructura JSON si aplica
- Indica longitud o extensión esperada

### 7. Contexto Legal Colombiano
- Mantén terminología legal apropiada para Colombia
- Referencia instituciones colombianas cuando aplique
- Considera normatividad colombiana vigente

### 8. Consistencia de Tono
- Profesional pero accesible
- Evita jerga innecesaria
- Mantén coherencia con la marca tuconsultorlegal.co

## Prompt Actual a Optimizar
{{current_prompt}}

## Tu Tarea
Genera una versión optimizada del prompt que:
1. Mantenga la funcionalidad y objetivo original
2. Mejore la claridad y estructura
3. Reduzca ambigüedades
4. Sea más efectivo para el contexto legal colombiano
5. Optimice para modelos de IA modernos (GPT-4, GPT-5)

IMPORTANTE: Responde SOLO con el prompt optimizado, sin explicaciones adicionales, sin encabezados tipo "Aquí está el prompt optimizado:", sin comentarios. Solo el prompt listo para usar.`;

async function getSystemConfig(supabase: any, key: string, defaultValue: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', key)
      .single();

    if (error || !data) {
      console.log(`Config ${key} not found, using default`);
      return defaultValue;
    }

    return data.config_value;
  } catch (e) {
    console.error(`Error fetching config ${key}:`, e);
    return defaultValue;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      prompt, 
      functionName, 
      functionDescription, 
      expectedOutput 
    } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ 
        error: 'El prompt es requerido' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('=== OPTIMIZE-PROMPT FUNCTION START ===');
    console.log(`Function: ${functionName}`);
    console.log(`Original prompt length: ${prompt.length} chars`);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY no está configurada');
    }

    // Initialize Supabase to get meta prompt from config
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    let metaPrompt = DEFAULT_META_PROMPT;
    let model = 'gpt-4.1-2025-04-14';

    if (supabaseUrl && supabaseServiceKey) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.3');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Get configurable meta prompt
      metaPrompt = await getSystemConfig(supabase, 'prompt_optimizer_meta_prompt', DEFAULT_META_PROMPT);
      
      // Get model for optimization
      model = await getSystemConfig(supabase, 'content_optimization_model', 'gpt-4.1-2025-04-14');
    }

    // Replace placeholders in meta prompt
    const fullPrompt = metaPrompt
      .replace('{{function_name}}', functionName || 'No especificado')
      .replace('{{function_description}}', functionDescription || 'No especificada')
      .replace('{{expected_output}}', expectedOutput || 'Texto estructurado')
      .replace('{{current_prompt}}', prompt);

    console.log(`Using model: ${model}`);
    console.log(`Meta prompt length: ${fullPrompt.length} chars`);

    // Build request parameters using shared utility
    const params = buildResponsesRequestParams(model, {
      input: fullPrompt,
      instructions: 'Eres un experto en ingeniería de prompts. Optimiza el prompt proporcionado siguiendo las directrices dadas. Responde SOLO con el prompt optimizado.',
      maxOutputTokens: 4000,
      jsonMode: false
    });

    // Call OpenAI Responses API
    const aiResponse = await callResponsesAPI(openaiApiKey, params);

    // Extract optimized prompt from response
    const optimizedPrompt = extractOutputText(aiResponse);

    if (!optimizedPrompt) {
      throw new Error('No se pudo generar el prompt optimizado');
    }

    console.log(`Optimized prompt length: ${optimizedPrompt.length} chars`);
    console.log('=== OPTIMIZE-PROMPT FUNCTION END ===');

    return new Response(JSON.stringify({
      success: true,
      optimizedPrompt: optimizedPrompt.trim(),
      originalLength: prompt.length,
      optimizedLength: optimizedPrompt.length,
      model
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in optimize-prompt:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Error al optimizar el prompt'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
