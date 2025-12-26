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
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// Helper function to get required system configuration - throws if not found
async function getRequiredConfig(supabaseClient: any, configKey: string): Promise<string> {
  const { data, error } = await supabaseClient
    .from('system_config')
    .select('config_value')
    .eq('config_key', configKey)
    .maybeSingle();

  if (error || !data?.config_value) {
    throw new Error(`Configuración '${configKey}' no encontrada en system_config. Por favor configúrela en el panel de administración.`);
  }

  return data.config_value;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !openAIApiKey) {
      throw new Error('Missing configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { current_prompt, target_audience } = await req.json();

    if (!current_prompt || !target_audience) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros requeridos' }), {
        status: 400,
        headers: { ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get model and prompt - NO FALLBACKS
    const [configuredModel, promptOptimizerInstructions] = await Promise.all([
      getRequiredConfig(supabase, 'prompt_optimizer_model'),
      getRequiredConfig(supabase, 'prompt_optimizer_instructions')
    ]);
    
    logResponsesRequest(configuredModel, 'improve-prompt-ai', true);

    const instructions = promptOptimizerInstructions;

    const userMessage = `Mejora este prompt para generación de documentos legales:

PROMPT ACTUAL:
${current_prompt}

TARGET AUDIENCE: ${target_audience}`;

    const requestParams = buildResponsesRequestParams(configuredModel, {
      input: [{ role: 'user', content: userMessage }],
      instructions,
      maxOutputTokens: 3000,
      temperature: 0.3,
      store: false,
      reasoning: { effort: 'low' } // Simple task - minimize reasoning tokens
    });

    const result = await callResponsesAPI(openAIApiKey, requestParams);

    if (!result.success) {
      throw new Error(result.error || 'OpenAI API error');
    }

    const improvedPrompt = result.text?.trim();

    if (!improvedPrompt) {
      throw new Error('No response from OpenAI');
    }

    return new Response(JSON.stringify({ 
      improved_prompt: improvedPrompt,
      model_used: configuredModel,
      target_audience
    }), {
      headers: { ...securityHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in improve-prompt-ai function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { ...securityHeaders, 'Content-Type': 'application/json' },
    });
  }
});
