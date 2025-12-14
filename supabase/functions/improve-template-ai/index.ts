import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { 
  buildResponsesRequestParams, 
  callResponsesAPI, 
  logResponsesRequest 
} from '../_shared/openai-responses-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== IMPROVE-TEMPLATE-AI FUNCTION STARTED ===');
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const requestBody = await req.json();
    console.log('Request body received:', requestBody);
    
    const { templateContent, docName, docCategory, docDescription, targetAudience } = requestBody;

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

    console.log('Initializing Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching system configuration...');
    let configData = null;
    try {
      const { data, error: configError } = await supabase
        .from('system_config')
        .select('config_key, config_value')
        .in('config_key', ['template_optimizer_model', 'template_optimizer_prompt']);

      if (configError) {
        console.error('Error fetching system config:', configError);
        configData = null;
      } else {
        configData = data;
      }
    } catch (configFetchError) {
      console.error('Exception fetching system config:', configFetchError);
      configData = null;
    }

    let selectedModel = 'gpt-4.1-2025-04-14';
    let systemPrompt: string | null = null;
    
    if (configData && configData.length > 0) {
      const modelConfig = configData.find(c => c.config_key === 'template_optimizer_model');
      const promptConfig = configData.find(c => c.config_key === 'template_optimizer_prompt');
      
      if (modelConfig?.config_value) {
        selectedModel = modelConfig.config_value;
        console.log('Using configured model:', selectedModel);
      }
      if (promptConfig?.config_value) {
        systemPrompt = promptConfig.config_value;
        console.log('Using configured system prompt');
      }
    }

    logResponsesRequest(selectedModel, 'improve-template-ai', true);

    if (!systemPrompt) {
      console.log('Using default system prompt');
      systemPrompt = `Eres un experto en redacción de documentos legales en Colombia. Tu tarea es mejorar plantillas de documentos legales para hacerlas más completas, precisas y profesionales.

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
12. ${targetAudience === 'empresas' ? 'Usa terminología legal corporativa apropiada' : 'Usa lenguaje legal claro pero accesible para personas naturales'}

OBJETIVO: Devolver únicamente la plantilla del documento mejorada.`;
    } else {
      systemPrompt = `${systemPrompt}

PÚBLICO OBJETIVO: ${targetAudience === 'empresas' ? 'Empresas y clientes corporativos' : 'Personas (clientes individuales)'}`;
    }

    console.log('Improving template with AI:', {
      docName,
      docCategory,
      templateLength: templateContent?.length || 0,
      targetAudience,
      model: selectedModel
    });

    const userMessage = `Documento: ${docName} - Categoría: ${docCategory}
Público objetivo: ${targetAudience === 'empresas' ? 'Empresas' : 'Personas'}
Descripción: ${docDescription}

${templateContent}

Mejora esta plantilla manteniendo todos los placeholders {{variable}} existentes.`;

    const requestParams = buildResponsesRequestParams(selectedModel, {
      input: [{ role: 'user', content: userMessage }],
      instructions: systemPrompt,
      maxOutputTokens: 4000,
      temperature: 0.3,
      store: false
    });

    console.log('Making OpenAI Responses API request with model:', selectedModel);

    const result = await callResponsesAPI(openAIApiKey, requestParams);

    if (!result.success) {
      console.error('OpenAI API error:', result.error);
      throw new Error(result.error || 'Error en la API de OpenAI');
    }

    const improvedTemplate = result.text?.trim();
    console.log('OpenAI response received, length:', improvedTemplate?.length);

    if (!improvedTemplate) {
      throw new Error('No se recibió respuesta de OpenAI');
    }

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
