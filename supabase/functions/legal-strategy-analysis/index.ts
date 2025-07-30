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
    const { caseDescription } = await req.json();

    if (!caseDescription) {
      return new Response(
        JSON.stringify({ error: 'Case description is required' }),
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

    // Get strategy AI model and prompt from system config
    const strategyModel = await getSystemConfig(supabase, 'strategy_ai_model', 'gpt-4.1-2025-04-14');
    const strategyPrompt = await getSystemConfig(
      supabase, 
      'strategy_ai_prompt', 
      'Eres un asistente especializado en estrategia legal. Analiza casos y proporciona estrategias integrales incluyendo vías de acción, argumentos, contraargumentos y precedentes.'
    );

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Using strategy model: ${strategyModel}`);

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: strategyModel,
        messages: [
          {
            role: 'system',
            content: `${strategyPrompt}

Instrucciones específicas:
- Analiza el caso legal proporcionado
- Identifica las mejores vías de acción legal disponibles
- Proporciona argumentos jurídicos sólidos con fundamentos legales
- Anticipa posibles contraargumentos y cómo responder
- Incluye precedentes judiciales relevantes cuando sea posible
- Proporciona recomendaciones estratégicas específicas

Responde en formato JSON con la siguiente estructura:
{
  "legalActions": [
    {
      "action": "Nombre de la acción legal",
      "viability": "high|medium|low",
      "description": "Descripción de la acción",
      "requirements": ["Lista", "de", "requisitos"]
    }
  ],
  "legalArguments": [
    {
      "argument": "Argumento legal",
      "foundation": "Base legal (artículos, leyes, etc.)",
      "strength": "strong|moderate|weak"
    }
  ],
  "counterarguments": [
    {
      "argument": "Posible contraargumento",
      "response": "Cómo responder",
      "mitigation": "Estrategia de mitigación"
    }
  ],
  "precedents": [
    {
      "case": "Nombre del caso/sentencia",
      "relevance": "Por qué es relevante",
      "outcome": "Resultado del caso"
    }
  ],
  "recommendations": ["Lista", "de", "recomendaciones", "estratégicas"]
}`
          },
          {
            role: 'user',
            content: `Analiza estratégicamente el siguiente caso legal:

${caseDescription}

Proporciona un análisis estratégico completo para el caso.`
          }
        ],
        temperature: 0.3,
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
    let strategyResult;
    try {
      strategyResult = JSON.parse(content);
    } catch (e) {
      // Fallback: create basic structure
      strategyResult = {
        legalActions: [
          {
            action: "Análisis Manual Requerido",
            viability: "medium",
            description: "El caso requiere análisis detallado",
            requirements: ["Consulta con especialista"]
          }
        ],
        legalArguments: [
          {
            argument: "Requiere análisis especializado",
            foundation: "Análisis detallado del caso",
            strength: "moderate"
          }
        ],
        counterarguments: [
          {
            argument: "Análisis pendiente",
            response: "Requiere revisión detallada",
            mitigation: "Consultar especialista"
          }
        ],
        precedents: [
          {
            case: "Análisis pendiente",
            relevance: "Requiere investigación específica",
            outcome: "Por determinar"
          }
        ],
        recommendations: ["Consultar con especialista legal", "Realizar análisis detallado del caso"]
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        caseDescription,
        ...strategyResult,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in legal-strategy-analysis function:', error);
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