import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Helper function to get system configuration
async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .single();

    if (error || !data) {
      return defaultValue || '';
    }

    return data.config_value;
  } catch (error) {
    console.error(`Error fetching config ${configKey}:`, error);
    return defaultValue || '';
  }
}

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

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
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

    return new Response(
      JSON.stringify({
        success: true,
        prompt,
        ...draftResult,
        timestamp: new Date().toISOString()
      }),
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