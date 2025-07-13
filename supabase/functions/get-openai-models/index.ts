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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Fetching available OpenAI models...');

    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`Error de OpenAI: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data) {
      console.error('Invalid OpenAI models response:', data);
      throw new Error('Respuesta inválida de OpenAI');
    }

    // Filter for text generation models that are commonly used
    const textModels = data.data.filter((model: any) => 
      model.id.includes('gpt') && 
      !model.id.includes('instruct') && 
      !model.id.includes('edit') &&
      !model.id.includes('embedding') &&
      !model.id.includes('whisper') &&
      !model.id.includes('tts') &&
      !model.id.includes('davinci-002') &&
      !model.id.includes('babbage-002')
    ).map((model: any) => ({
      id: model.id,
      object: model.object,
      created: model.created,
      owned_by: model.owned_by
    }));

    console.log(`Found ${textModels.length} text generation models`);

    return new Response(JSON.stringify({
      success: true,
      models: textModels
    }), {
      headers: securityHeaders
    });

  } catch (error) {
    console.error('Error fetching OpenAI models:', error);
    return new Response(JSON.stringify({ 
      error: 'Error obteniendo modelos de OpenAI',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: securityHeaders
    });
  }
});