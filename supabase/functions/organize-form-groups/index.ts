import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildOpenAIRequestParams, logModelRequest } from "../_shared/openai-model-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client to get system configuration
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration');
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.3');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get configured OpenAI model
    const { data: configData, error: configError } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'openai_model')
      .maybeSingle();

    const selectedModel = (configError || !configData) 
      ? 'gpt-4.1-2025-04-14'
      : configData.config_value;

    logModelRequest(selectedModel, 'organize-form-groups');

    const { placeholder_fields, ai_prompt } = await req.json();

    if (!placeholder_fields || !Array.isArray(placeholder_fields)) {
      return new Response(
        JSON.stringify({ error: 'placeholder_fields array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Organizing questions for', placeholder_fields.length, 'fields');

    const prompt = `Eres un experto en UX y experiencia de usuario para formularios legales.

Contexto del documento: "${ai_prompt || 'Documento legal'}"

Campos disponibles:
${placeholder_fields.map((field, index) => `${index + 1}. ${field.field}: ${field.description}`).join('\n')}

Tu tarea es organizar estos campos en grupos lógicos para mejorar la experiencia del usuario. Cada grupo debe:
1. Tener un nombre descriptivo y claro
2. Contener campos relacionados entre sí
3. Seguir un orden lógico (información básica primero, detalles específicos después)
4. No tener más de 5 campos por grupo para evitar fatiga del usuario

Responde ÚNICAMENTE con un JSON válido en este formato:
{
  "groups": [
    {
      "name": "Información Personal",
      "description": "Datos básicos del solicitante",
      "fields": [0, 1, 2]
    },
    {
      "name": "Detalles del Documento", 
      "description": "Información específica del documento",
      "fields": [3, 4, 5]
    }
  ]
}

Los números en "fields" deben corresponder al índice (0-based) de los campos en el array original.`;

    const messages = [
      {
        role: 'system',
        content: 'Eres un experto en UX que organiza formularios para mejorar la experiencia del usuario. Responde únicamente con JSON válido.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const requestParams = buildOpenAIRequestParams(selectedModel, messages, {
      maxTokens: 1000,
      temperature: 0.3
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestParams),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    let groupedFields;
    try {
      groupedFields = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      // Fallback: create a single group with all fields
      groupedFields = {
        groups: [
          {
            name: "Información del Documento",
            description: "Completa todos los campos requeridos",
            fields: placeholder_fields.map((_, index) => index)
          }
        ]
      };
    }

    console.log('Successfully organized fields into groups');

    return new Response(
      JSON.stringify(groupedFields),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in organize-form-groups function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
