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

    console.log(`Optimizing consultation prompt for ${target_audience} using model ${selectedModel}`);

    // Sistema de prompt optimizado para prompts de consultoría legal
    const systemPrompt = `Eres un experto en optimización de prompts para consultoría legal. Tu especialidad es mejorar prompts para asistentes de IA que brindan consultoría legal específicamente para ${target_audience}.

CONTEXTO:
- El prompt será usado por un asistente de IA que brinda consultoría legal
- Debe estar optimizado específicamente para ${target_audience}
- Debe mantener un enfoque profesional y especializado en el tipo de audiencia

CRITERIOS DE OPTIMIZACIÓN PARA ${target_audience.toUpperCase()}:
1. LENGUAJE APROPIADO: Adapta el lenguaje y terminología según la audiencia
2. CASOS DE USO: Incluye ejemplos y situaciones típicas para ${target_audience}
3. LÍMITES CLAROS: Establece qué puede y no puede hacer el asistente
4. ESTRUCTURA PROFESIONAL: Mantén organización clara y profesional
5. DISCLAIMERS: Incluye avisos legales apropiados

INSTRUCCIONES ESPECÍFICAS:
${target_audience === 'personas' ? `
- Usa lenguaje claro y accesible para el público general
- Incluye explicaciones de conceptos legales complejos
- Enfócate en situaciones cotidianas: familia, trabajo, vivienda, contratos básicos
- Proporciona orientación práctica y pasos a seguir
` : `
- Usa terminología empresarial y legal más técnica
- Enfócate en temas corporativos: contratos comerciales, normatividad empresarial, compliance
- Incluye consideraciones fiscales y regulatorias
- Proporciona análisis más profundos de riesgos legales
`}

Devuelve SOLO el prompt optimizado, sin explicaciones adicionales.`;

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

    const optimizedPrompt = data.choices[0].message.content.trim();

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