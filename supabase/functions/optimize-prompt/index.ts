import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildResponsesRequestParams, callResponsesAPI } from "../_shared/openai-responses-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Note: DEFAULT_META_PROMPT removed - now loaded from database only

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
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.3');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get configurable meta prompt - no fallback
    const metaPrompt = await getSystemConfig(supabase, 'prompt_optimizer_meta_prompt', '');
    
    if (!metaPrompt) {
      console.error('❌ prompt_optimizer_meta_prompt not configured in system_config');
      return new Response(JSON.stringify({ error: 'Configuración faltante: prompt_optimizer_meta_prompt' }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Get model for optimization
    const model = await getSystemConfig(supabase, 'prompt_optimizer_model', 'gpt-4.1-2025-04-14');
    
    // Get reasoning effort for optimization
    const reasoningEffort = await getSystemConfig(supabase, 'reasoning_effort_prompt_optimizer', 'medium');

    // Replace placeholders in meta prompt
    const fullPrompt = metaPrompt
      .replace('{{function_name}}', functionName || 'No especificado')
      .replace('{{function_description}}', functionDescription || 'No especificada')
      .replace('{{expected_output}}', expectedOutput || 'Texto estructurado')
      .replace('{{current_prompt}}', prompt);

    console.log(`Using model: ${model}`);
    console.log(`Reasoning effort: ${reasoningEffort}`);
    console.log(`Meta prompt length: ${fullPrompt.length} chars`);

    // Get optimizer instructions from config
    const optimizerInstructions = await getSystemConfig(supabase, 'prompt_optimizer_instructions', '');
    
    // Build request parameters using shared utility
    const params = buildResponsesRequestParams(model, {
      input: fullPrompt,
      instructions: optimizerInstructions || 'Eres un experto en ingeniería de prompts. Optimiza el prompt proporcionado siguiendo las directrices dadas. Responde SOLO con el prompt optimizado.',
      maxOutputTokens: 16000,
      jsonMode: false,
      reasoningEffort: reasoningEffort as 'low' | 'medium' | 'high'
    });

    // Call OpenAI Responses API
    const aiResponse = await callResponsesAPI(openaiApiKey, params);

    if (!aiResponse.success) {
      throw new Error(aiResponse.error || 'Error calling OpenAI API');
    }

    // Get optimized prompt directly from the response (callResponsesAPI already extracts text)
    const optimizedPrompt = aiResponse.text;

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
