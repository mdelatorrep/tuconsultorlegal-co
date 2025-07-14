import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to call OpenAI API with retry logic
async function callOpenAIWithRetry(requestBody: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get configured OpenAI model
    const { data: configData, error: configError } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'openai_model')
      .single();

    const selectedModel = (configError || !configData) 
      ? 'gpt-4o-mini'  // Default fallback model
      : configData.config_value;

    console.log('Using OpenAI model:', selectedModel);

    const { current_prompt, target_audience } = await req.json();

    if (!current_prompt || !target_audience) {
      return new Response(JSON.stringify({ 
        error: 'Faltan parámetros requeridos: current_prompt, target_audience' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Optimizing consultation prompt for ${target_audience} using model ${selectedModel}`);

    // Sistema de prompt optimizado para prompts de consultoría legal
    const systemPrompt = `Eres un experto en optimización de prompts para consultoría legal. Tu especialidad es mejorar prompts para asistentes de IA que brindan consultoría legal específicamente para ${target_audience}.

CONTEXTO CRÍTICO:
- El prompt será usado por un asistente de IA que brinda consultoría legal en Colombia
- Debe estar optimizado específicamente para ${target_audience}
- Debe mantener un enfoque profesional y especializado según el tipo de audiencia
- El asistente debe conocer la legislación colombiana y sus particularidades

CRITERIOS DE OPTIMIZACIÓN PARA ${target_audience.toUpperCase()}:
1. LENGUAJE Y COMUNICACIÓN: Adapta el lenguaje según la sofisticación legal de la audiencia
2. CASOS DE USO ESPECÍFICOS: Incluye ejemplos reales y situaciones típicas para ${target_audience}
3. LÍMITES Y ALCANCE: Define claramente qué puede y no puede hacer el asistente
4. ESTRUCTURA Y METODOLOGÍA: Organiza la información de manera lógica y accesible
5. DISCLAIMERS LEGALES: Incluye avisos apropiados según el nivel de la audiencia

INSTRUCCIONES ESPECÍFICAS PARA ${target_audience.toUpperCase()}:
${target_audience === 'personas' ? `
AUDIENCIA: PERSONAS NATURALES
- LENGUAJE: Claro, simple y accesible, evitando jerga legal innecesaria
- EXPLICACIONES: Define conceptos legales complejos en términos comprensibles
- ÁREAS DE ENFOQUE: 
  * Derecho de familia (divorcio, custodia, alimentos)
  * Derecho laboral (contratos, despidos, prestaciones)
  * Derecho civil (arrendamientos, compraventa, vecindad)
  * Derecho del consumidor (garantías, devoluciones, servicios públicos)
  * Derecho penal básico (denuncias, delitos menores)
- METODOLOGÍA: Proporciona pasos claros y prácticos
- EJEMPLOS: Usa situaciones cotidianas y fáciles de entender
- DISCLAIMERS: Enfatiza que es orientación general, no asesoría legal personalizada
` : `
AUDIENCIA: EMPRESAS Y ORGANIZACIONES
- LENGUAJE: Técnico-profesional, usando terminología empresarial y legal apropiada
- ANÁLISIS: Profundo y estratégico, considerando implicaciones a mediano y largo plazo
- ÁREAS DE ENFOQUE:
  * Derecho comercial (contratos, sociedades, fusiones, adquisiciones)
  * Derecho laboral empresarial (nómina, despidos masivos, reestructuraciones)
  * Compliance y regulatorio (normatividad sectorial, cumplimiento)
  * Derecho tributario (obligaciones fiscales, beneficios, auditorías)
  * Propiedad intelectual (marcas, patentes, derechos de autor)
  * Protección de datos (HABEAS DATA, tratamiento de información)
- CONSIDERACIONES: Incluye análisis de riesgos, costos-beneficios y alternativas estratégicas
- EJEMPLOS: Casos empresariales complejos y multidisciplinarios
- DISCLAIMERS: Recomienda validación con área legal especializada para decisiones críticas
`}

IMPORTANTE: El prompt optimizado debe ser específico para el contexto colombiano y incluir referencias a la legislación nacional cuando sea relevante.

Devuelve SOLO el prompt optimizado y mejorado, sin explicaciones adicionales.`;

    const requestBody = {
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Optimiza este prompt de consultoría legal para ${target_audience}:

PROMPT ACTUAL:
${current_prompt}

TARGET AUDIENCE: ${target_audience}

Devuelve el prompt optimizado y mejorado.`
        }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    };

    console.log('Calling OpenAI API for consultation prompt optimization...');
    const data = await callOpenAIWithRetry(requestBody);

    let optimizedPrompt = data.choices[0].message.content.trim();
    
    // Clean the response to remove special characters and formatting
    optimizedPrompt = optimizedPrompt
      .replace(/```[a-zA-Z]*\n?/g, '') // Remove code block markers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markdown **text**
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic markdown *text*
      .replace(/`([^`]+)`/g, '$1') // Remove inline code `text`
      .replace(/#{1,6}\s*/g, '') // Remove markdown headers
      .replace(/^\s*[-*+]\s+/gm, '') // Remove bullet points
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered lists
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links [text](url)
      .replace(/_{2,}/g, ' ') // Replace multiple underscores with space
      .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newline
      .trim();

    console.log('Consultation prompt optimization completed successfully');

    return new Response(JSON.stringify({ 
      optimized_prompt: optimizedPrompt,
      model_used: selectedModel,
      target_audience: target_audience
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in optimize-consultation-prompts function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});