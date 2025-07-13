import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const securityHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: securityHeaders });
  }

  try {
    console.log('=== GET OPENAI MODELS START ===');

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'OpenAI API key no configurada' 
      }), {
        status: 500,
        headers: securityHeaders
      });
    }

    console.log('Fetching available OpenAI models...');

    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      return new Response(JSON.stringify({ 
        success: false,
        error: `Error de OpenAI API: ${response.status}`,
        details: errorData 
      }), {
        status: response.status,
        headers: securityHeaders
      });
    }

    const data = await response.json();
    console.log('Raw models count:', data?.data?.length || 0);
    
    if (!data.data || !Array.isArray(data.data)) {
      console.error('Invalid OpenAI models response structure:', data);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Respuesta inválida de OpenAI' 
      }), {
        status: 500,
        headers: securityHeaders
      });
    }

    // Filter for text generation models that are commonly used
    const allModels = data.data.map((model: any) => ({
      id: model.id,
      object: model.object,
      created: model.created,
      owned_by: model.owned_by
    }));

    // Filter for GPT models only
    const gptModels = allModels.filter((model: any) => 
      model.id.includes('gpt') && 
      !model.id.includes('instruct') && 
      !model.id.includes('edit') &&
      !model.id.includes('embedding') &&
      !model.id.includes('whisper') &&
      !model.id.includes('tts') &&
      !model.id.includes('davinci-002') &&
      !model.id.includes('babbage-002')
    );

    console.log(`Found ${allModels.length} total models, filtered to ${gptModels.length} GPT models`);
    console.log('=== GET OPENAI MODELS SUCCESS ===');

    return new Response(JSON.stringify({
      success: true,
      models: gptModels,
      total_models: allModels.length
    }), {
      headers: securityHeaders
    });

  } catch (error) {
    console.error('=== GET OPENAI MODELS ERROR ===');
    console.error('Error fetching OpenAI models:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Error interno obteniendo modelos de OpenAI',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: securityHeaders
    });
  }
});