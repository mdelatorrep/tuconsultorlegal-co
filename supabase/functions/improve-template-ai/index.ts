import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== IMPROVE-TEMPLATE-AI FUNCTION STARTED ===');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    console.log('Environment check:', {
      hasOpenAIKey: !!openAIApiKey,
      hasSupabaseKey: !!supabaseServiceKey,
      hasSupabaseUrl: !!supabaseUrl
    });
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration');
    }

    // Parse request body
    const requestBody = await req.json();
    console.log('Request body received:', requestBody);
    
    const { templateContent, docName, docCategory, docDescription, targetAudience } = requestBody;

    // Validate required fields
    if (!templateContent || templateContent.trim().length === 0) {
      console.log('Validation failed - missing template content');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'El contenido de la plantilla es requerido' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    console.log('Initializing Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get system configuration for model
    console.log('Fetching system configuration...');
    const { data: configData, error: configError } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', ['template_optimizer_model']);

    if (configError) {
      console.error('Error fetching system config:', configError);
      throw new Error('Error al obtener configuración del sistema');
    }

    console.log('Config data retrieved:', configData);

    // Extract model from config
    let selectedModel = 'gpt-4.1-2025-04-14'; // Default model
    
    if (configData && configData.length > 0) {
      const modelConfig = configData.find(c => c.config_key === 'template_optimizer_model');
      
      if (modelConfig?.config_value) {
        selectedModel = modelConfig.config_value;
        console.log('Using configured model:', selectedModel);
      }
    }

    // System prompt
    const systemPrompt = `Eres un experto en redacción de documentos legales en Colombia. Tu tarea es mejorar plantillas de documentos legales para hacerlas más completas, precisas y profesionales.

PÚBLICO OBJETIVO: ${targetAudience === 'empresas' ? 'Empresas y clientes corporativos' : 'Personas (clientes individuales)'}

REGLAS IMPORTANTES:
1. MANTÉN TODOS LOS PLACEHOLDERS existentes en el formato {{nombre_variable}}
2. NO elimines ningún placeholder que ya existe
3. Puedes agregar nuevos placeholders si es necesario para completar el documento
4. Mejora la redacción legal, estructura y claridad
5. Asegúrate de que el documento sea válido bajo la ley colombiana
6. Mantén el formato profesional y la estructura lógica
7. Conserva todas las cláusulas importantes existentes
8. RESPONDE ÚNICAMENTE CON LA PLANTILLA MEJORADA EN TEXTO PLANO
9. NO incluyas explicaciones, comentarios, ni texto adicional
10. NO uses caracteres especiales de markdown como **, _, \`, etc.
11. NO incluyas encabezados, títulos o secciones explicativas
12. ${targetAudience === 'empresas' ? 'Usa terminología legal corporativa apropiada y considera aspectos empresariales específicos' : 'Usa lenguaje legal claro pero accesible para personas naturales'}

OBJETIVO: Devolver únicamente la plantilla del documento mejorada en texto plano, adaptada para ${targetAudience === 'empresas' ? 'empresas' : 'personas naturales'}, sin formato adicional.`;

    console.log('Improving template with AI:', {
      docName,
      docCategory,
      templateLength: templateContent?.length || 0,
      targetAudience,
      model: selectedModel
    });

    // Prepare user message
    const userMessage = `Documento: ${docName} - Categoría: ${docCategory}
Público objetivo: ${targetAudience === 'empresas' ? 'Empresas' : 'Personas'}
Descripción: ${docDescription}

${templateContent}

Mejora esta plantilla manteniendo todos los placeholders {{variable}} existentes y adaptándola para ${targetAudience === 'empresas' ? 'clientes corporativos' : 'personas naturales'}.`;

    // Prepare OpenAI request
    const openAIRequestBody = {
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    };

    console.log('Making OpenAI API request with model:', selectedModel);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openAIRequestBody),
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure:', data);
      throw new Error('Respuesta inválida de OpenAI');
    }

    const improvedTemplate = data.choices[0].message.content.trim();
    console.log('Raw OpenAI response length:', improvedTemplate.length);

    console.log('Template improvement successful');

    const finalResponse = {
      success: true, 
      improvedTemplate: improvedTemplate,
      originalLength: templateContent.length,
      improvedLength: improvedTemplate.length,
      modelUsed: selectedModel
    };
    
    console.log('Sending final response with improved template');

    return new Response(
      JSON.stringify(finalResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('=== ERROR IN IMPROVE-TEMPLATE-AI ===');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});