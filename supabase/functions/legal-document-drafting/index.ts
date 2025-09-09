import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Helper function to get system configuration
async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    console.log(`Fetching config for key: ${configKey}`);
    
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle();

    console.log(`Config result for ${configKey}:`, { data, error });

    if (error) {
      console.error(`Error fetching config ${configKey}:`, error);
      return defaultValue || '';
    }

    if (!data) {
      console.log(`No config found for ${configKey}, using default: ${defaultValue}`);
      return defaultValue || '';
    }

    console.log(`Using config ${configKey}: ${data.config_value}`);
    return data.config_value;
  } catch (error) {
    console.error(`Exception fetching config ${configKey}:`, error);
    return defaultValue || '';
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to save results to legal_tools_results table
async function saveToolResult(supabase: any, lawyerId: string, toolType: string, inputData: any, outputData: any, metadata: any = {}) {
  try {
    console.log(`Saving ${toolType} result for lawyer: ${lawyerId}`);
    
    const { error } = await supabase
      .from('legal_tools_results')
      .insert({
        lawyer_id: lawyerId,
        tool_type: toolType,
        input_data: inputData,
        output_data: outputData,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      });

    if (error) {
      console.error('Error saving tool result:', error);
    } else {
      console.log(`✅ Successfully saved ${toolType} result`);
    }
  } catch (error) {
    console.error('Exception saving tool result:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authentication header and verify user
    const authHeader = req.headers.get('authorization');
    let lawyerId = null;
    
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      );
      
      const token = authHeader.replace('Bearer ', '');
      const { data: userData } = await supabaseClient.auth.getUser(token);
      lawyerId = userData.user?.id;
    }
    
    const { prompt, documentType } = await req.json();

    if (!prompt || !documentType) {
      return new Response(
        JSON.stringify({ error: 'Prompt and document type are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get drafting AI model and prompt from system config
    const draftingModel = await getSystemConfig(supabase, 'drafting_ai_model', 'gpt-4.1-2025-04-14');
    const draftingPrompt = await getSystemConfig(
      supabase, 
      'drafting_ai_prompt', 
      'Eres un asistente especializado en redacción de documentos legales. Genera borradores profesionales y estructurados siguiendo la legislación colombiana.'
    );

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Using drafting model: ${draftingModel}`);

    // Check if it's a reasoning model
    const isReasoningModel = draftingModel.startsWith('o3') || draftingModel.startsWith('o4');
    
    console.log(`Model type: ${isReasoningModel ? 'reasoning' : 'standard'}`);

    // Prepare the request body based on model type
    let requestBody;
    
    if (isReasoningModel) {
      // For reasoning models, we need a simpler structure
      requestBody = {
        model: draftingModel,
        messages: [
          {
            role: 'user',
            content: `${draftingPrompt}

Genera un borrador de: ${documentType}
Descripción específica: ${prompt}

Instrucciones específicas:
- Genera un borrador profesional del documento solicitado
- Sigue la estructura típica del tipo de documento
- Incluye todas las cláusulas esenciales
- Usa terminología jurídica apropiada para Colombia
- Marca con [ESPECIFICAR] los campos que requieren personalización
- Incluye cláusulas de protección estándar

El documento debe ser apropiado para Colombia y seguir las mejores prácticas legales.

Responde en formato JSON con la siguiente estructura:
{
  "content": "Contenido completo del borrador en formato markdown",
  "sections": ["Lista", "de", "secciones", "incluidas"],
  "documentType": "Nombre completo del tipo de documento"
}`
          }
        ]
      };
    } else {
      // For standard models, use the existing structure
      requestBody = {
        model: draftingModel,
        messages: [
          {
            role: 'system',
            content: `${draftingPrompt}

Instrucciones específicas:
- Genera un borrador profesional del documento solicitado
- Sigue la estructura típica del tipo de documento
- Incluye todas las cláusulas esenciales
- Usa terminología jurídica apropiada para Colombia
- Marca con [ESPECIFICAR] los campos que requieren personalización
- Incluye cláusulas de protección estándar

Responde en formato JSON con la siguiente estructura:
{
  "content": "Contenido completo del borrador en formato markdown",
  "sections": ["Lista", "de", "secciones", "incluidas"],
  "documentType": "Nombre completo del tipo de documento"
}`
          },
          {
            role: 'user',
            content: `Genera un borrador de: ${documentType}

Descripción específica: ${prompt}

El documento debe ser apropiado para Colombia y seguir las mejores prácticas legales.`
          }
        ],
        temperature: 0.4,
        max_tokens: 4000
      };
    }

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0].message.content;

    // Try to parse as JSON, fallback to structured response if parsing fails
    let draftResult;
    try {
      draftResult = JSON.parse(content);
    } catch (e) {
      // Fallback: use content as is
      draftResult = {
        content: content,
        sections: ["Contenido Generado"],
        documentType: documentType
      };
    }

    const resultData = {
      success: true,
      prompt,
      ...draftResult,
      timestamp: new Date().toISOString()
    };

    // Save result to database if user is authenticated
    if (lawyerId) {
      await saveToolResult(
        supabase,
        lawyerId,
        'drafting',
        { prompt, documentType },
        draftResult,
        { timestamp: new Date().toISOString() }
      );
    }

    return new Response(
      JSON.stringify(resultData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in legal-document-drafting function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});