import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

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
    
    // Initialize Supabase client
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceKey || !supabaseUrl) {
      console.error('Missing Supabase configuration');
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin authentication
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header found');
      return new Response(JSON.stringify({ 
        error: 'No autorizado - Token de administrador requerido' 
      }), {
        status: 401,
        headers: securityHeaders
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Extracted token length:', token.length);

    // Verify admin token
    const { data: adminData, error: adminError } = await supabase
      .from('admin_accounts')
      .select('id, active, is_super_admin')
      .eq('id', token)
      .eq('active', true)
      .single();

    if (adminError || !adminData) {
      console.error('Admin verification failed:', adminError);
      return new Response(JSON.stringify({ 
        error: 'Token de administrador inválido' 
      }), {
        status: 403,
        headers: securityHeaders
      });
    }

    console.log('Admin verified:', adminData.id);

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
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

    console.log('OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`Error de OpenAI: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw models count:', data?.data?.length || 0);
    
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

    console.log(`Filtered to ${textModels.length} text generation models`);
    console.log('=== GET OPENAI MODELS SUCCESS ===');

    return new Response(JSON.stringify({
      success: true,
      models: textModels
    }), {
      headers: securityHeaders
    });

  } catch (error) {
    console.error('=== GET OPENAI MODELS ERROR ===');
    console.error('Error fetching OpenAI models:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Error obteniendo modelos de OpenAI',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: securityHeaders
    });
  }
});