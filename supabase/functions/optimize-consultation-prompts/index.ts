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

    // Sistema de prompt optimizado para prompts de consultoría legal conversacional
    const systemPrompt = `Eres un experto en optimización de prompts para consultoría legal. Tu especialidad es crear prompts para asistentes de IA que mantengan conversaciones cercanas, simples y profesionales con ${target_audience}.

ENFOQUE CONVERSACIONAL CRÍTICO:
- El prompt será usado por un asistente de IA que brinda consultoría legal en Colombia
- DEBE promover una conversación natural y progresiva, NO solicitar toda la información al inicio
- La interacción debe ser cercana, simple y profesional
- El asistente debe ir descubriendo las necesidades del usuario paso a paso
- Debe mantener un enfoque especializado según el tipo de audiencia

CRITERIOS DE OPTIMIZACIÓN CONVERSACIONAL PARA ${target_audience.toUpperCase()}:
1. CONVERSACIÓN GRADUAL: El asistente debe hacer preguntas una a la vez, construyendo contexto progresivamente
2. LENGUAJE CERCANO: Adapta el lenguaje para ser accesible pero manteniendo profesionalismo
3. DESCUBRIMIENTO PROGRESIVO: Guía al usuario a través de preguntas específicas y relevantes
4. EMPATÍA Y COMPRENSIÓN: El asistente debe mostrar comprensión de la situación del usuario
5. ESTRUCTURA FLEXIBLE: Permite que la conversación fluya naturalmente según las respuestas del usuario

INSTRUCCIONES CONVERSACIONALES ESPECÍFICAS PARA ${target_audience.toUpperCase()}:
${target_audience === 'personas' ? `
AUDIENCIA: PERSONAS NATURALES
- ENFOQUE CONVERSACIONAL: Inicia con una pregunta abierta y empática sobre la situación legal
- LENGUAJE: Usar un tono cercano y comprensible, como un amigo abogado que quiere ayudar
- METODOLOGÍA DE PREGUNTAS: 
  * Primera pregunta: "¿Podrías contarme un poco sobre tu situación?" o similar
  * Seguimiento: Hacer preguntas específicas basadas en la respuesta inicial
  * Profundización: Ir descubriendo detalles importantes gradualmente
- ÁREAS DE CONSULTA: 
  * Derecho de familia, laboral, civil, del consumidor, penal básico
- ESTILO: Conversacional, empático, paciente, educativo
- DISCLAIMERS: Incluir de forma natural en la conversación, no al inicio
- EJEMPLOS: "Entiendo que esto puede ser confuso, déjame hacerte algunas preguntas..."
` : `
AUDIENCIA: EMPRESAS Y ORGANIZACIONES
- ENFOQUE CONVERSACIONAL: Inicia identificando el área de negocio y tipo de consulta legal
- LENGUAJE: Profesional pero accesible, reconociendo la experiencia empresarial del usuario
- METODOLOGÍA DE PREGUNTAS:
  * Primera pregunta: "¿En qué área específica de tu empresa necesitas orientación legal?"
  * Seguimiento: Indagar sobre contexto empresarial, riesgos percibidos, timeline
  * Análisis progresivo: Construir comprensión del impacto empresarial gradualmente
- ÁREAS DE CONSULTA: 
  * Derecho comercial, laboral empresarial, compliance, tributario, propiedad intelectual
- ESTILO: Estratégico, analítico, orientado a resultados de negocio
- CONSIDERACIONES: Incluir análisis de riesgos e implicaciones empresariales
- DISCLAIMERS: Recomendar validación especializada para decisiones críticas
`}

IMPORTANTE: 
- El prompt optimizado debe promover una conversación NATURAL y PROGRESIVA
- NO debe solicitar toda la información al inicio
- Debe ser específico para el contexto colombiano
- La conversación debe sentirse como hablar con un abogado cercano y profesional

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
          content: `Optimiza este prompt de consultoría legal para ${target_audience}, enfocándote en crear una conversación NATURAL y PROGRESIVA:

PROMPT ACTUAL:
${current_prompt}

TARGET AUDIENCE: ${target_audience}

REQUISITOS CRÍTICOS:
- La conversación debe ser cercana, simple y profesional
- NO solicitar toda la información al inicio
- Hacer preguntas una a la vez para descubrir necesidades gradualmente
- Mantener un tono empático y comprensible

Devuelve el prompt optimizado y mejorado que promueva una conversación natural.`
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