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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Función para realizar el llamado a OpenAI con reintentos
    async function callOpenAIWithRetry(requestBody: any, maxRetries = 3) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`OpenAI attempt ${attempt}/${maxRetries}`);
          
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorData = await response.text();
            console.error(`OpenAI API error (attempt ${attempt}):`, response.status, errorData);
            
            // Si es el último intento o un error permanente, lanzar error
            if (attempt === maxRetries || response.status === 400 || response.status === 401) {
              throw new Error(`Error de OpenAI: ${response.status} ${response.statusText}`);
            }
            
            // Esperar antes del siguiente intento (backoff exponencial)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }

          const data = await response.json();
          
          if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error(`Invalid OpenAI response (attempt ${attempt}):`, data);
            
            if (attempt === maxRetries) {
              throw new Error('Respuesta inválida de OpenAI');
            }
            
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }

          return data;
          
        } catch (error) {
          console.error(`OpenAI call failed (attempt ${attempt}):`, error);
          
          if (attempt === maxRetries) {
            throw error;
          }
          
          // Esperar antes del siguiente intento
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    console.log('=== IMPROVE-DOCUMENT-INFO FUNCTION START ===');
    
    // Initialize Supabase client to get system configuration
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    console.log('Environment check:', {
      hasOpenAIKey: !!openAIApiKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });
    
    if (!supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration');
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.3');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Getting system configuration...');
    // Get configured OpenAI model
    const { data: configData, error: configError } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'openai_model')
      .single();

    const selectedModel = (configError || !configData) 
      ? 'gpt-4o-mini'  // Default fallback - compatible model
      : configData.config_value;

    console.log('Using OpenAI model:', selectedModel);

    const { docName, docDesc, docCategory, targetAudience } = await req.json();

    console.log('Improving document info with AI:', {
      docName,
      docDesc,
      docCategory,
      targetAudience,
      model: selectedModel
    });

    if (!docName || !docDesc) {
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

    const requestBody = {
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: `Eres un experto en marketing legal y comunicación con usuarios finales en Colombia. Tu tarea es mejorar el nombre y descripción de servicios legales para que sean más atractivos y comprensibles para el usuario final.

PÚBLICO OBJETIVO: ${targetAudience === 'empresas' ? 'Empresas y clientes corporativos' : 'Personas (clientes individuales)'}

REGLAS IMPORTANTES:
1. Usa lenguaje claro y sencillo que cualquier persona pueda entender
2. Evita jerga legal compleja innecesaria
3. Enfócate en los beneficios y la utilidad para el usuario
4. Usa términos que la gente busca comúnmente
5. Haz que suene profesional pero accesible
6. Mantén la precisión legal pero con lenguaje amigable
7. RESPONDE ÚNICAMENTE CON UN JSON con las claves "improvedName" e "improvedDescription"
8. NO incluyas explicaciones adicionales, solo el JSON
9. ${targetAudience === 'empresas' ? 'Usa terminología corporativa apropiada y enfócate en aspectos empresariales' : 'Usa lenguaje amigable para personas naturales y enfócate en beneficios personales'}

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
      max_tokens: 1000,
    };

    const data = await callOpenAIWithRetry(requestBody);

    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response:', data);
      throw new Error('Respuesta inválida de OpenAI');
    }

    const responseText = data.choices[0].message.content.trim();
    
    // Parse the JSON response
    let improvedInfo;
    try {
      improvedInfo = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      throw new Error('Error al procesar la respuesta de IA');
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
    console.error('Error in improve-document-info function:', error);
    
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