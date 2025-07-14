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

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin token
    const { data: verification, error: verificationError } = await supabase.functions.invoke('verify-admin-token', {
      headers: { authorization: authHeader }
    });

    if (verificationError || !verification?.valid) {
      return new Response(JSON.stringify({ error: 'Invalid admin token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get configured OpenAI model
    const { data: configData, error: configError } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'openai_model')
      .single();

    const selectedModel = (configError || !configData) 
      ? 'gpt-4.1-2025-04-14'  // Default fallback
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

    console.log(`Improving prompt for ${target_audience} using model ${selectedModel}`);

    // Sistema de prompt optimizado para mejora de prompts de consultoría legal
    const systemPrompt = `Eres un experto en optimización de prompts para asistentes de IA especializados en consultoría legal. Tu tarea es mejorar y optimizar prompts para chatbots de consultoría legal.

CONTEXTO:
- El prompt será usado por un asistente de IA que brinda consultoría legal
- El target audience es: ${target_audience}
- El asistente debe ser profesional, preciso y útil
- Debe mantener límites éticos y legales apropiados

CRITERIOS DE MEJORA:
1. CLARIDAD: El prompt debe ser claro y específico sobre el rol del asistente
2. PROFESIONALISMO: Debe mantener un tono profesional y confiable
3. LÍMITES: Debe establecer claramente qué puede y no puede hacer el asistente
4. ESTRUCTURA: Debe tener una estructura lógica y organizada
5. ADAPTACIÓN: Debe estar adaptado específicamente para ${target_audience}

INSTRUCCIONES:
- Mejora el prompt actual manteniendo su propósito principal
- Hazlo más específico y efectivo para consultoría legal dirigida a ${target_audience}
- Incluye disclaimers legales apropiados
- Asegúrate de que sea comprensible pero profesional
- Optimiza para generar respuestas útiles y precisas

Devuelve SOLO el prompt mejorado, sin explicaciones adicionales.`;

    const requestBody = {
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Mejora este prompt de consultoría legal:

PROMPT ACTUAL:
${current_prompt}

TARGET AUDIENCE: ${target_audience}

Devuelve el prompt mejorado y optimizado.`
        }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    };

    console.log('Calling OpenAI API for prompt improvement...');
    const data = await callOpenAIWithRetry(requestBody);

    const improvedPrompt = data.choices[0].message.content.trim();

    console.log('Prompt improvement completed successfully');

    return new Response(JSON.stringify({ 
      improved_prompt: improvedPrompt,
      model_used: selectedModel,
      target_audience: target_audience
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in improve-prompt-ai function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});