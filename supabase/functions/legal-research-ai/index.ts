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
    console.log('Legal research function called with request method:', req.method);
    const { query } = await req.json();
    console.log('Received query:', query);

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
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

    // Get research AI model and prompt from system config
    const researchModel = await getSystemConfig(supabase, 'research_ai_model', 'gpt-4.1-2025-04-14');
    const researchPrompt = await getSystemConfig(
      supabase, 
      'research_ai_prompt', 
      'Eres un asistente especializado en investigación jurídica colombiana. Analiza la consulta y proporciona respuestas basadas en legislación, jurisprudencia y normativa vigente.'
    );

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Using research model: ${researchModel}`);

    // Check if it's a reasoning model
    const isReasoningModel = researchModel.startsWith('o3') || researchModel.startsWith('o4');
    const endpoint = isReasoningModel 
      ? 'https://api.openai.com/v1/chat/completions'  // Reasoning models use same endpoint but different structure
      : 'https://api.openai.com/v1/chat/completions';

    console.log(`Model type: ${isReasoningModel ? 'reasoning' : 'standard'}`);

    // Prepare the request body based on model type
    let requestBody;
    
    if (isReasoningModel) {
      // For reasoning models, we need a simpler structure
      requestBody = {
        model: researchModel,
        messages: [
          {
            role: 'user',
            content: `${researchPrompt}

Consulta: ${query}

Instrucciones específicas:
- Analiza la consulta jurídica del usuario
- Proporciona hallazgos específicos con referencias a legislación colombiana
- Incluye jurisprudencia relevante cuando esté disponible
- Menciona decretos, leyes y artículos específicos
- Estructura la respuesta de manera profesional y detallada
- Incluye una conclusión práctica

Responde en formato JSON con la siguiente estructura:
{
  "findings": "Análisis detallado con referencias legales",
  "sources": ["Lista", "de", "fuentes", "específicas"],
  "conclusion": "Conclusión práctica basada en el análisis"
}`
          }
        ]
      };
    } else {
      // For standard models, use the existing structure
      requestBody = {
        model: researchModel,
        messages: [
          {
            role: 'system',
            content: `${researchPrompt}

Instrucciones específicas:
- Analiza la consulta jurídica del usuario
- Proporciona hallazgos específicos con referencias a legislación colombiana
- Incluye jurisprudencia relevante cuando esté disponible
- Menciona decretos, leyes y artículos específicos
- Estructura la respuesta de manera profesional y detallada
- Incluye una conclusión práctica

Responde en formato JSON con la siguiente estructura:
{
  "findings": "Análisis detallado con referencias legales",
  "sources": ["Lista", "de", "fuentes", "específicas"],
  "conclusion": "Conclusión práctica basada en el análisis"
}`
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      };
    }

    // Call OpenAI API
    const openaiResponse = await fetch(endpoint, {
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

    // Try to parse as JSON, fallback to text if parsing fails
    let findings, sources, conclusion;
    try {
      const parsed = JSON.parse(content);
      findings = parsed.findings;
      sources = parsed.sources || [];
      conclusion = parsed.conclusion;
    } catch (e) {
      // Fallback: use content as findings
      findings = content;
      sources = ["Análisis basado en conocimiento jurídico general"];
      conclusion = "Consulte con un especialista para casos específicos.";
    }

    return new Response(
      JSON.stringify({
        success: true,
        findings,
        sources,
        conclusion,
        query,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in legal-research-ai function:', error);
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