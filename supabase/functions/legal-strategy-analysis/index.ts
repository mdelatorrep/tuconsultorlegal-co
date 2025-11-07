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
    const strategyModel = await getSystemConfig(supabase, 'strategy_ai_model', 'gpt-4o-mini');
    const strategyPrompt = await getSystemConfig(
      supabase, 
      'strategy_ai_prompt', 
      'Eres un asistente especializado en estrategia legal. Analiza casos y proporciona estrategias integrales incluyendo vías de acción, argumentos, contraargumentos y precedentes.'
    );

    console.log(`Using strategy model from config: ${strategyModel}`);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Using strategy model: ${strategyModel}`);

    // Check if it's a reasoning model
    const isReasoningModel = strategyModel.startsWith('o3') || strategyModel.startsWith('o4');
    
    console.log(`Model type: ${isReasoningModel ? 'reasoning' : 'standard'}`);

    // Prepare the request body based on model type
    let requestBody;
    
    if (isReasoningModel) {
      // For reasoning models, we need a simpler structure
      requestBody = {
        model: strategyModel,
        messages: [
          {
            role: 'user',
            content: `${strategyPrompt}

Caso a analizar: ${caseDescription}

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
          }
        ]
      };
    } else {
      // For standard models, use the existing structure
      requestBody = {
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

    const resultData = {
      success: true,
      caseDescription,
      ...strategyResult,
      timestamp: new Date().toISOString()
    };

    // Save result to database if user is authenticated
    if (lawyerId) {
      await saveToolResult(
        supabase,
        lawyerId,
        'strategy',
        { caseDescription },
        strategyResult,
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