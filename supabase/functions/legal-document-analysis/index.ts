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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentContent, fileName } = await req.json();

    if (!documentContent) {
      return new Response(
        JSON.stringify({ error: 'Document content is required' }),
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

    // Get analysis AI model and prompt from system config - use valid models
    const configModel = await getSystemConfig(supabase, 'analysis_ai_model', 'gpt-4o-mini');
    const analysisPrompt = await getSystemConfig(
      supabase, 
      'analysis_ai_prompt', 
      'Eres un asistente especializado en análisis de documentos legales. Analiza contratos y documentos identificando riesgos, cláusulas problemáticas y proporcionando recomendaciones.'
    );

    // Use valid OpenAI model and limit content to prevent token overflow
    const analysisModel = configModel.includes('o4-mini') ? 'gpt-4o-mini' : 
                          configModel.includes('o3-') || configModel.includes('o4-') ? 'gpt-4o-mini' : 
                          'gpt-4o-mini';

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Using analysis model: ${analysisModel}`);

    // Truncate document content to prevent token limit issues
    const truncatedContent = documentContent.substring(0, 2000);

    // Use standard chat completions for reliability
    const requestBody = {
      model: analysisModel,
      messages: [
        {
          role: 'system',
          content: `${analysisPrompt}

Instrucciones específicas:
- Analiza el documento legal proporcionado
- Identifica el tipo de documento
- Encuentra cláusulas importantes y evalúa su nivel de riesgo
- Identifica riesgos potenciales y su severidad
- Proporciona recomendaciones específicas para mejorar el documento

Responde en formato JSON con la siguiente estructura:
{
  "documentType": "Tipo de documento identificado",
  "clauses": [
    {
      "name": "Nombre de la cláusula",
      "content": "Extracto del contenido",
      "riskLevel": "low|medium|high",
      "recommendation": "Recomendación específica (opcional)"
    }
  ],
  "risks": [
    {
      "type": "Tipo de riesgo",
      "description": "Descripción del riesgo",
      "severity": "low|medium|high"
    }
  ],
  "recommendations": ["Lista", "de", "recomendaciones", "generales"]
}`
        },
        {
          role: 'user',
          content: `Analiza el siguiente documento legal:

NOMBRE DEL ARCHIVO: ${fileName || 'Documento'}

CONTENIDO (primeros 2000 caracteres):
${truncatedContent}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    };

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
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (e) {
      // Fallback: create structured response from text
      analysis = {
        documentType: "Documento Legal",
        clauses: [
          {
            name: "Análisis General",
            content: content.substring(0, 200) + "...",
            riskLevel: "medium",
            recommendation: "Revisar con detalle"
          }
        ],
        risks: [
          {
            type: "Análisis Requerido",
            description: "El documento requiere revisión manual",
            severity: "medium"
          }
        ],
        recommendations: ["Revisar documento manualmente", "Consultar con especialista"]
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        fileName: fileName || 'Documento',
        ...analysis,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in legal-document-analysis function:', error);
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