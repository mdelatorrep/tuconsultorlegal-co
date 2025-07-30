import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

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

// Function to get system configuration with default fallback
async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .single();

    if (error) {
      console.warn(`Failed to get system config for ${configKey}:`, error.message);
      return defaultValue || '';
    }

    return data?.config_value || defaultValue || '';
  } catch (error) {
    console.warn(`Error fetching system config for ${configKey}:`, error);
    return defaultValue || '';
  }
}

// Function to call OpenAI API with retry logic
async function callOpenAIWithRetry(requestBody: any, maxRetries = 3) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`OpenAI API call attempt ${attempt}/${maxRetries}`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`OpenAI API error (attempt ${attempt}):`, error);
        
        if (attempt === maxRetries) {
          throw new Error(error.error?.message || `API request failed with status ${response.status}`);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        continue;
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error(`Invalid OpenAI response (attempt ${attempt}):`, data);
        
        if (attempt === maxRetries) {
          throw new Error('Invalid response from OpenAI API');
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        continue;
      }

      console.log(`OpenAI API call successful on attempt ${attempt}`);
      return data;
    } catch (error) {
      console.error(`OpenAI API call failed (attempt ${attempt}):`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== IMPROVE-PROMPT-AI Function Started ===');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      throw new Error('Supabase configuration missing');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase client created successfully');

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('Authorization header missing');
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
        status: 401,
        headers: { ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin token
    console.log('Verifying admin token...');
    const { data: verification, error: verificationError } = await supabase.functions.invoke('verify-admin-token', {
      headers: { authorization: authHeader }
    });

    if (verificationError || !verification?.valid) {
      console.error('Invalid admin token:', verificationError);
      return new Response(JSON.stringify({ error: 'Invalid admin token' }), {
        status: 401,
        headers: { ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Admin token verified successfully');

    const requestBody = await req.json();
    const { current_prompt, target_audience } = requestBody;

    if (!current_prompt || !target_audience) {
      console.error('Missing required parameters:', { current_prompt: !!current_prompt, target_audience: !!target_audience });
      return new Response(JSON.stringify({ 
        error: 'Faltan parámetros requeridos: current_prompt, target_audience' 
      }), {
        status: 400,
        headers: { ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing prompt improvement request for target audience: ${target_audience}`);

    // Get system configurations
    console.log('Fetching system configurations...');
    const [configuredModel, configuredSystemPrompt] = await Promise.all([
      getSystemConfig(supabase, 'prompt_optimizer_model', 'gpt-4.1-2025-04-14'),
      getSystemConfig(supabase, 'prompt_optimizer_prompt', `Eres un experto en optimización de prompts para asistentes de IA especializados en la generación de documentos legales. Tu tarea es mejorar y optimizar prompts para chatbots que recopilan información y generan documentos legales.

CONTEXTO ESPECÍFICO PARA GENERACIÓN DE DOCUMENTOS:
- El prompt será usado por un asistente de IA que genera documentos legales en Colombia
- El asistente debe recopilar información de manera estructurada y eficiente
- Debe mantener un estilo cercano, fácil de entender, profesional y seguro

CRITERIOS DE MEJORA ESPECÍFICOS PARA GENERACIÓN DE DOCUMENTOS:

1. ESTILO DE CONVERSACIÓN:
   - Tono cercano, profesional y seguro que transmita confianza
   - Fácil de entender, evitando jerga legal innecesaria
   - Saludo inicial que transmita confianza sobre la calidad del documento
   - Énfasis en la seguridad y confidencialidad de la información

2. ESTRUCTURA DE RECOPILACIÓN DE INFORMACIÓN:
   - La información se solicita en BLOQUES TEMÁTICOS progresivos
   - NO pedir toda la información al inicio de la conversación
   - Organizar por frentes lógicos (ej: datos del vendedor, comprador, inmueble, etc.)
   - Una pregunta o bloque a la vez para no abrumar al usuario

3. FORMATEO Y VALIDACIÓN DE DATOS:
   - Instrucciones para formatear campos en MAYÚSCULAS cuando corresponda
   - Normalización de direcciones con información complementaria (ciudad, departamento, país)
   - Valores monetarios en número Y texto
   - Validación de formatos (cédulas, fechas, montos)

4. PROFESIONALISMO Y CONFIANZA:
   - Explicar brevemente por qué se necesita cada dato
   - Confirmar información importante antes de continuar
   - Transmitir seguridad sobre la calidad y validez legal del documento
   - Mencionar confidencialidad y protección de datos

5. ADAPTACIÓN A AUDIENCIA:
   - Lenguaje apropiado según sea personas naturales o empresas
   - Consideraciones específicas del contexto colombiano

INSTRUCCIONES DE OPTIMIZACIÓN:
- Mejora el prompt actual manteniendo su propósito de generación de documentos
- Incluye un saludo que genere confianza sobre la calidad y seguridad
- Estructura la recopilación de información en bloques lógicos
- Incluye instrucciones específicas de formateo de datos
- Asegúrate de que el tono sea cercano pero profesional
- Incluye validaciones apropiadas para el contexto colombiano

Devuelve SOLO el prompt mejorado, sin explicaciones adicionales.`)
    ]);

    console.log(`Using model: ${configuredModel}`);
    console.log('System prompt configured from database');

    // Build dynamic system prompt with target audience
    const dynamicSystemPrompt = configuredSystemPrompt.replace(/\${target_audience}/g, target_audience);

    const openAIRequestBody = {
      model: configuredModel,
      messages: [
        {
          role: 'system',
          content: dynamicSystemPrompt
        },
        {
          role: 'user',
          content: `Mejora este prompt para generación de documentos legales siguiendo las mejores prácticas:

PROMPT ACTUAL:
${current_prompt}

TARGET AUDIENCE: ${target_audience}

REQUISITOS ESPECÍFICOS:
- Estilo cercano, fácil de entender, profesional y seguro
- Información solicitada en bloques por frentes (no toda al inicio)
- Saludo que transmita confianza sobre calidad y seguridad del documento
- Formateo de campos: mayúsculas, direcciones normalizadas, valores monetarios en número y texto

EJEMPLO DE ESTRUCTURA REQUERIDA:
"Eres un asistente legal especializado en [tipo de documento] en Colombia.

TU OBJETIVO: Ayudar a [audiencia] a crear un [documento] completo y legalmente válido.

SALUDO INICIAL: Transmite confianza sobre la calidad del documento y seguridad de la información.

INFORMACIÓN A RECOPILAR:
[Lista organizada por bloques temáticos]

ESTILO DE CONVERSACIÓN:
- Mantén un tono profesional pero cercano
- Explica brevemente por qué necesitas cada dato
- Confirma información importante antes de continuar
- Haz una pregunta a la vez para no abrumar

FORMATEO DE DATOS:
- Nombres y lugares en MAYÚSCULAS
- Direcciones normalizadas con ciudad, departamento y país
- Valores monetarios en número y texto
- Validación de formatos apropiados

VALIDACIONES:
[Validaciones específicas del documento]"

Devuelve el prompt mejorado siguiendo esta estructura y consideraciones.`
        }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    };

    console.log('Calling OpenAI API for prompt improvement...');
    const data = await callOpenAIWithRetry(openAIRequestBody);

    const improvedPrompt = data.choices[0].message.content.trim();

    console.log('Prompt improvement completed successfully');
    console.log('=== IMPROVE-PROMPT-AI Function Completed ===');

    return new Response(JSON.stringify({ 
      improved_prompt: improvedPrompt,
      model_used: configuredModel,
      target_audience: target_audience
    }), {
      headers: { ...securityHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in improve-prompt-ai function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { ...securityHeaders, 'Content-Type': 'application/json' },
    });
  }
});