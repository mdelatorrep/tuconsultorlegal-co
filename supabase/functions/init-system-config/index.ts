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

// Configuraciones predeterminadas del sistema
const DEFAULT_CONFIGS = [
  // Legal Tools
  {
    config_key: 'research_ai_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo de IA utilizado para el módulo de investigación legal'
  },
  {
    config_key: 'research_system_prompt',
    config_value: 'Eres un asistente especializado en investigación jurídica. Proporciona análisis detallados y citas precisas de legislación relevante.',
    description: 'Prompt base para el sistema de investigación legal'
  },
  {
    config_key: 'analysis_ai_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo de IA utilizado para el módulo de análisis legal'
  },
  {
    config_key: 'analysis_system_prompt',
    config_value: 'Eres un experto en análisis jurídico. Evalúa documentos legales con precisión y proporciona recomendaciones estratégicas.',
    description: 'Prompt base para el sistema de análisis legal'
  },
  {
    config_key: 'drafting_ai_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo de IA utilizado para el módulo de redacción legal'
  },
  {
    config_key: 'drafting_system_prompt',
    config_value: 'Eres un redactor jurídico experto. Crea documentos legales precisos, claros y conformes a la legislación vigente.',
    description: 'Prompt base para el sistema de redacción legal'
  },
  {
    config_key: 'strategy_ai_model',
    config_value: 'o3-2025-04-16',
    description: 'Modelo de IA utilizado para el módulo de estrategia legal'
  },
  {
    config_key: 'strategy_system_prompt',
    config_value: 'Eres un estratega jurídico senior. Desarrolla estrategias legales comprehensivas considerando todos los aspectos del caso.',
    description: 'Prompt base para el sistema de estrategia legal'
  },
  
  // AI Management
  {
    config_key: 'agent_creation_ai_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo utilizado para generar y optimizar agentes legales'
  },
  {
    config_key: 'agent_creation_system_prompt',
    config_value: 'Eres un experto en creación de agentes legales especializados. Genera prompts, plantillas y configuraciones optimizadas.',
    description: 'Prompt utilizado para generar nuevos agentes legales'
  },
  {
    config_key: 'document_description_optimizer_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo utilizado para optimizar descripciones de documentos'
  },
  {
    config_key: 'document_description_optimizer_prompt',
    config_value: 'Optimiza la descripción del documento legal para que sea clara, precisa y atractiva para el usuario final.',
    description: 'Prompt para mejorar descripciones de documentos legales'
  },
  {
    config_key: 'template_optimizer_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo utilizado para optimizar plantillas de documentos'
  },
  {
    config_key: 'template_optimizer_prompt',
    config_value: 'Optimiza la plantilla del documento legal para que sea completa, precisa y fácil de completar.',
    description: 'Prompt para mejorar plantillas de documentos legales'
  },
  {
    config_key: 'content_optimization_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo para optimización general de contenidos'
  },
  
  // System General
  {
    config_key: 'system_timeout_seconds',
    config_value: '30',
    description: 'Tiempo límite en segundos para operaciones del sistema'
  },
  {
    config_key: 'max_retry_attempts',
    config_value: '3',
    description: 'Número máximo de reintentos para operaciones fallidas'
  },
  {
    config_key: 'document_sla_hours',
    config_value: '4',
    description: 'Tiempo en horas para cumplir SLA de documentos'
  },
  {
    config_key: 'api_rate_limit_requests',
    config_value: '100',
    description: 'Límite de peticiones por minuto a las APIs'
  },
  {
    config_key: 'openai_api_timeout',
    config_value: '30',
    description: 'Tiempo límite en segundos para peticiones a OpenAI'
  }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: securityHeaders });
  }

  try {
    console.log('=== INIT-SYSTEM-CONFIG FUNCTION START ===');
    
    // Initialize Supabase client
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration');
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.3');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking existing configurations...');
    
    // Get existing configurations
    const { data: existingConfigs, error: fetchError } = await supabase
      .from('system_config')
      .select('config_key');

    if (fetchError) {
      console.error('Error fetching existing configs:', fetchError);
      throw fetchError;
    }

    const existingKeys = new Set(existingConfigs?.map(c => c.config_key) || []);
    console.log('Existing config keys:', existingKeys.size);

    // Filter out configs that already exist
    const configsToInsert = DEFAULT_CONFIGS.filter(config => !existingKeys.has(config.config_key));
    
    console.log(`Found ${configsToInsert.length} new configurations to insert`);

    if (configsToInsert.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Todas las configuraciones ya están inicializadas',
        existing_count: existingKeys.size,
        inserted_count: 0
      }), {
        headers: securityHeaders
      });
    }

    // Insert new configurations
    const { data, error } = await supabase
      .from('system_config')
      .insert(configsToInsert);

    if (error) {
      console.error('Error inserting configs:', error);
      throw error;
    }

    console.log(`Successfully inserted ${configsToInsert.length} configurations`);

    return new Response(JSON.stringify({
      success: true,
      message: `Configuraciones del sistema inicializadas correctamente`,
      existing_count: existingKeys.size,
      inserted_count: configsToInsert.length,
      inserted_configs: configsToInsert.map(c => c.config_key)
    }), {
      headers: securityHeaders
    });

  } catch (error) {
    console.error('Error in init-system-config:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Error inicializando configuraciones del sistema',
      details: error.message 
    }), {
      status: 500,
      headers: securityHeaders
    });
  }
});