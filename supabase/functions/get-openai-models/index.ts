import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('=== GET-OPENAI-MODELS FUNCTION START ===');
    
    // Get OpenAI API key from environment
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('API Key status:', openAIApiKey ? 'Found' : 'Not found');
    console.log('API Key length:', openAIApiKey ? openAIApiKey.length : 0);
    
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not found in environment');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'OpenAI API key no configurada en el servidor',
        debug: 'OPENAI_API_KEY environment variable is missing'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Making request to OpenAI API...');
    
    // Fetch models from OpenAI API
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      return new Response(JSON.stringify({ 
        success: false,
        error: `Error de OpenAI API: ${response.status}`,
        details: errorText,
        debug: `Status: ${response.status}, Response: ${errorText}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    
    if (!data || !data.data || !Array.isArray(data.data)) {
      console.error('Invalid response structure from OpenAI API');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Respuesta inválida de OpenAI API' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Filter para incluir:
const selectedModels = data.data
  .filter((model: any) =>
    model.id &&
    (
      model.id.includes('gpt') ||                // incluye modelos GPT (e.g. gpt-3.5, gpt-4, gpt-4o, gpt-4.1...)
      model.id.match(/^o1/) ||                    // incluye o1, o1‑mini, o1‑preview, o1‑pro
      model.id.match(/^o3/) ||                    // incluye o3, o3‑mini, o3‑pro
      model.id.includes('o4-mini')                // incluye o4-mini / o4-mini-high
    ) &&
    !model.id.includes('embedding') &&           // excluir embeddings
    !model.id.includes('whisper') &&             // excluir Whisper
    !model.id.includes('tts')                    // excluir TTS
  )
  .map((model: any) => ({
    id: model.id,
    object: model.object ?? 'model',
    created: model.created ?? 0,
    owned_by: model.owned_by ?? 'openai'
  }))
  .sort((a: any, b: any) => a.id.localeCompare(b.id));

    console.log(`Successfully fetched ${gptModels.length} GPT models from ${data.data.length} total models`);

    return new Response(JSON.stringify({
      success: true,
      models: gptModels,
      total_available: data.data.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error fetching OpenAI models:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});