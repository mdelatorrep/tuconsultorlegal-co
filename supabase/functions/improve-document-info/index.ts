import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { buildOpenAIRequestParams, logModelRequest } from '../_shared/openai-model-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== IMPROVE-DOCUMENT-INFO FUNCTION STARTED ===');
  
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

    // Parse request body with error handling
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body received:', requestBody);
    } catch (jsonError) {
      console.error('Invalid JSON in request body:', jsonError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Formato de datos inválido en la solicitud' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const { docName, docDesc, docCategory, targetAudience } = requestBody;

    // Validate required fields with detailed logging
    console.log('Validating required fields:', { docName, docDesc, docCategory, targetAudience });
    
    if (!docName || typeof docName !== 'string' || !docName.trim()) {
      console.log('Validation failed - docName missing or invalid');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'El nombre del documento es requerido y debe ser válido' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!docDesc || typeof docDesc !== 'string' || !docDesc.trim()) {
      console.log('Validation failed - docDesc missing or invalid');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'La descripción del documento es requerida y debe ser válida' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with error handling
    console.log('Initializing Supabase client...');
    let supabase;
    try {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    } catch (supabaseError) {
      console.error('Failed to initialize Supabase client:', supabaseError);
      throw new Error('Error al conectar con la base de datos');
    }

    // Get system configuration for model and prompt with timeout
    console.log('Fetching system configuration...');
    let configData = null;
    try {
      const { data, error: configError } = await supabase
        .from('system_config')
        .select('config_key, config_value')
        .in('config_key', ['document_description_optimizer_model', 'document_description_optimizer_prompt']);

      if (configError) {
        console.error('Error fetching system config:', configError);
        console.log('Continuing with default configuration...');
        configData = null; // Will use defaults
      } else {
        configData = data;
      }
    } catch (configFetchError) {
      console.error('Exception fetching system config:', configFetchError);
      console.log('Continuing with default configuration...');
      configData = null; // Will use defaults
    }

    console.log('Config data retrieved:', configData);

    // Extract model and system prompt from config
    let selectedModel = 'gpt-4o-mini'; // Default model
    let systemPrompt = null;
    
    if (configData && configData.length > 0) {
      const modelConfig = configData.find(c => c.config_key === 'document_description_optimizer_model');
      const promptConfig = configData.find(c => c.config_key === 'document_description_optimizer_prompt');
      
      if (modelConfig?.config_value) {
        selectedModel = modelConfig.config_value;
        console.log('Using configured model:', selectedModel);
      }
      if (promptConfig?.config_value) {
        systemPrompt = promptConfig.config_value;
        console.log('Using configured system prompt');
      }
    }

    // Use default system prompt if none configured
    if (!systemPrompt) {
      console.log('Using default system prompt');
      systemPrompt = `Eres un experto en marketing legal y comunicación con usuarios finales en Colombia. Tu tarea es mejorar el nombre y descripción de servicios legales para que sean más atractivos y comprensibles para el usuario final.

PÚBLICO OBJETIVO: ${targetAudience === 'empresas' ? 'Empresas y clientes corporativos' : 'Personas (clientes individuales)'}

REGLAS IMPORTANTES:
1. Usa lenguaje claro y sencillo que cualquier persona pueda entender
2. Evita jerga legal compleja innecesaria
3. Enfócate en los beneficios y la utilidad para el usuario
4. Usa términos que la gente busca comúnmente
5. Haz que suene profesional pero accesible
6. Mantén la precisión legal pero con lenguaje amigable
7. RESPONDE ÚNICAMENTE CON UN JSON válido con las claves "improvedName" e "improvedDescription"
8. NO incluyas explicaciones adicionales, solo el JSON válido

FORMATO DE RESPUESTA REQUERIDO:
{
  "improvedName": "nombre mejorado aquí",
  "improvedDescription": "descripción mejorada aquí"
}

OBJETIVO: Mejorar el nombre y descripción para que sean más atractivos y comprensibles para ${targetAudience === 'empresas' ? 'empresas' : 'personas naturales'}.`;
    }

    // Prepare user message
    const userMessage = `Categoría: ${docCategory || 'No especificada'}
Público objetivo: ${targetAudience === 'empresas' ? 'Empresas' : 'Personas'}
Nombre actual: ${docName}
Descripción actual: ${docDesc}

Mejora el nombre y descripción para que sean más atractivos y comprensibles para ${targetAudience === 'empresas' ? 'clientes corporativos' : 'usuarios finales individuales'}.`;

    // Prepare OpenAI request using centralized utility
    logModelRequest(selectedModel, 'improve-document-info');
    
    const openAIRequestBody = buildOpenAIRequestParams(
      selectedModel,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      { 
        maxTokens: 1000, // Increased for GPT-5 models
        temperature: 0.3,
        responseFormat: { type: "json_object" } // Force JSON output
      }
    );
    
    console.log('OpenAI request body:', JSON.stringify(openAIRequestBody, null, 2));
    
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

    const responseText = data.choices[0].message.content.trim();
    console.log('Raw OpenAI response:', responseText);
    
    // Parse the JSON response
    let improvedInfo;
    try {
      // Try to extract JSON from the response
      let jsonText = responseText;
      
      // Check if response contains JSON within code blocks or extra text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      console.log('Attempting to parse JSON:', jsonText);
      improvedInfo = JSON.parse(jsonText);
      
      // Validate required fields
      if (!improvedInfo.improvedName || !improvedInfo.improvedDescription) {
        console.error('Missing required fields in response:', improvedInfo);
        throw new Error('La respuesta de IA no contiene los campos requeridos');
      }
      
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Response that failed to parse:', responseText);
      
      // Fallback: return original values
      console.log('Using fallback - returning original values');
      improvedInfo = {
        improvedName: docName,
        improvedDescription: docDesc
      };
    }

    console.log('Document info improvement successful');

    const finalResponse = {
      success: true, 
      improvedName: improvedInfo.improvedName,
      improvedDescription: improvedInfo.improvedDescription,
      originalName: docName,
      originalDescription: docDesc,
      modelUsed: selectedModel
    };
    
    console.log('Sending final response:', finalResponse);

    return new Response(
      JSON.stringify(finalResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('=== ERROR IN IMPROVE-DOCUMENT-INFO ===');
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