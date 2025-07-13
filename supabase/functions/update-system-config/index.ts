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

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: securityHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { config_key, config_value, description } = await req.json();

    if (!config_key || !config_value) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'config_key y config_value son requeridos' 
      }), {
        status: 400,
        headers: securityHeaders
      });
    }

    console.log('Updating system config:', { config_key, config_value, description });

    // Upsert the configuration
    const { data, error } = await supabase
      .from('system_config')
      .upsert({
        config_key,
        config_value,
        description,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'config_key'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Error de base de datos: ${error.message}`);
    }

    console.log('System config updated successfully:', data);

    return new Response(JSON.stringify({
      success: true,
      config: data
    }), {
      headers: securityHeaders
    });

  } catch (error) {
    console.error('Error updating system config:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Error actualizando configuración del sistema',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: securityHeaders
    });
  }
});