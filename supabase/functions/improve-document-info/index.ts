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

  try {
    console.log('=== IMPROVE-DOCUMENT-INFO FUNCTION START ===');
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client to get system configuration
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration');
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.3');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get configured OpenAI model and prompt for document description optimization
    const { data: configData, error: configError } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', ['document_description_optimizer_model', 'document_description_optimizer_prompt']);

    let selectedModel = 'gpt-4.1-2025-04-14';
    let customSystemPrompt = null;
    
    if (!configError && configData) {
      const modelConfig = configData.find(c => c.config_key === 'document_description_optimizer_model');
      const promptConfig = configData.find(c => c.config_key === 'document_description_optimizer_prompt');
      
      if (modelConfig?.config_value) selectedModel = modelConfig.config_value;
      if (promptConfig?.config_value) customSystemPrompt = promptConfig.config_value;
    }

    console.log('=== REQUEST BODY PARSING ===');
    const requestBody = await req.json();
    console.log('Raw request body:', requestBody);
    
    const { docName, docDesc, docCategory, targetAudience } = requestBody;

    console.log('Parsed parameters:', {
      docName: docName || 'MISSING',
      docDesc: docDesc || 'MISSING', 
      docCategory: docCategory || 'MISSING',
      targetAudience: targetAudience || 'MISSING'
    });

    if (!docName || !docDesc) {
      console.log('=== VALIDATION FAILED ===');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'El nombre y descripción del documento son requeridos' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('=== CALLING OPENAI API ===');
    
    const openAIRequestBody = {
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: customSystemPrompt || `Eres un experto en marketing legal y comunicación con usuarios finales en Colombia. Tu tarea es mejorar el nombre y descripción de servicios legales para que sean más atractivos y comprensibles para el usuario final.

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

OBJETIVO: Mejorar el nombre y descripción para que sean más atractivos y comprensibles para ${targetAudience === 'empresas' ? 'empresas' : 'personas naturales'}.`
        },
        {
          role: 'user',
          content: `Categoría: ${docCategory}
Público objetivo: ${targetAudience === 'empresas' ? 'Empresas' : 'Personas'}
Nombre actual: ${docName}
Descripción actual: ${docDesc}

Mejora el nombre y descripción para que sean más atractivos y comprensibles para ${targetAudience === 'empresas' ? 'clientes corporativos' : 'usuarios finales individuales'}.`
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    };

    console.log('Making OpenAI request...');
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
    console.log('OpenAI response data:', data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure:', data);
      throw new Error('Respuesta inválida de OpenAI');
    }

    const responseText = data.choices[0].message.content.trim();
    console.log('Raw OpenAI response:', responseText);
    
    // Parse the JSON response
    let improvedInfo;
    try {
      // Try to extract JSON from the response if it contains extra text
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
      
      // Fallback: return original values if AI response is malformed
      console.log('Using fallback - returning original values');
      improvedInfo = {
        improvedName: docName,
        improvedDescription: docDesc
      };
    }

    console.log('Document info improvement successful:', {
      originalName: docName,
      improvedName: improvedInfo.improvedName,
      originalDesc: docDesc,
      improvedDesc: improvedInfo.improvedDescription
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        improvedName: improvedInfo.improvedName,
        improvedDescription: improvedInfo.improvedDescription,
        originalName: docName,
        originalDescription: docDesc
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('=== ERROR IN IMPROVE-DOCUMENT-INFO ===');
    console.error('Error type:', typeof error);
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