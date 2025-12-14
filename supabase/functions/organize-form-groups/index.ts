import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  buildResponsesRequestParams, 
  callResponsesAPI, 
  logResponsesRequest 
} from "../_shared/openai-responses-utils.ts";

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
    if (!openaiApiKey) throw new Error('OpenAI API key not configured');

    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration');
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.3');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Helper to get system config
    const getSystemConfig = async (key: string, defaultValue: string): Promise<string> => {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('config_value')
          .eq('config_key', key)
          .maybeSingle();
        if (error || !data) return defaultValue;
        return data.config_value;
      } catch (e) {
        return defaultValue;
      }
    };

    // Get configured model and prompt
    const selectedModel = await getSystemConfig('organize_form_ai_model', 'gpt-4.1-2025-04-14');
    const systemPrompt = await getSystemConfig('organize_form_prompt', '');
    
    if (!systemPrompt) {
      console.error('❌ organize_form_prompt not configured in system_config');
      return new Response(JSON.stringify({ error: 'Configuración faltante: organize_form_prompt' }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    logResponsesRequest(selectedModel, 'organize-form-groups', true);

    const { placeholder_fields, ai_prompt } = await req.json();

    if (!placeholder_fields || !Array.isArray(placeholder_fields)) {
      return new Response(
        JSON.stringify({ error: 'placeholder_fields array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Organizing questions for', placeholder_fields.length, 'fields');

    const instructions = systemPrompt;

    const input = `Contexto del documento: "${ai_prompt || 'Documento legal'}"

Campos disponibles:
${placeholder_fields.map((field: any, index: number) => `${index + 1}. ${field.field}: ${field.description}`).join('\n')}

Organiza estos campos en grupos lógicos (2-5 campos por grupo). Responde ÚNICAMENTE con JSON válido:
{
  "groups": [
    {"name": "Información Personal", "description": "Datos básicos", "fields": [0, 1, 2]},
    {"name": "Detalles del Documento", "description": "Información específica", "fields": [3, 4, 5]}
  ]
}

Los números en "fields" son índices (0-based) del array original.`;

    const params = buildResponsesRequestParams(selectedModel, {
      input,
      instructions,
      maxOutputTokens: 2000,
      temperature: 0.3,
      jsonMode: true,
      store: false,
      reasoning: { effort: 'low' } // Simple task - minimize reasoning tokens
    });

    const result = await callResponsesAPI(openaiApiKey, params);

    if (!result.success) {
      throw new Error(`Form grouping failed: ${result.error}`);
    }

    let groupedFields;
    try {
      groupedFields = JSON.parse(result.text || '{}');
    } catch (parseError) {
      console.error('Failed to parse response:', result.text);
      groupedFields = {
        groups: [{
          name: "Información del Documento",
          description: "Completa todos los campos requeridos",
          fields: placeholder_fields.map((_: any, index: number) => index)
        }]
      };
    }

    console.log('✅ Form groups organized successfully');

    return new Response(
      JSON.stringify(groupedFields),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in organize-form-groups:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
