import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  buildResponsesRequestParams, 
  callResponsesAPI, 
  logResponsesRequest,
  loadWebSearchConfigAndBuildTool,
  supportsWebSearch
} from "../_shared/openai-responses-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get system configuration
async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle();

    if (error || !data) return defaultValue || '';
    return data.config_value;
  } catch (error) {
    return defaultValue || '';
  }
}

// Helper function to save results
async function saveToolResult(supabase: any, lawyerId: string, toolType: string, inputData: any, outputData: any, metadata: any = {}) {
  try {
    await supabase.from('legal_tools_results').insert({
      lawyer_id: lawyerId,
      tool_type: toolType,
      input_data: inputData,
      output_data: outputData,
      metadata: { ...metadata, timestamp: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Error saving tool result:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authentication
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get configuration
    const strategyModel = await getSystemConfig(supabase, 'strategy_ai_model', 'gpt-4o-mini');
    const strategyPrompt = await getSystemConfig(supabase, 'strategy_system_prompt', '');
    
    if (!strategyPrompt) {
      console.error('❌ strategy_system_prompt not configured in system_config');
      return new Response(JSON.stringify({ error: 'Configuración faltante: strategy_system_prompt' }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OpenAI API key not configured');

    logResponsesRequest(strategyModel, 'legal-strategy-analysis', true);

    const jsonFormat = `{
  "legalActions": [{"action": "Nombre", "viability": "high|medium|low", "description": "...", "requirements": [...]}],
  "legalArguments": [{"argument": "...", "foundation": "...", "strength": "strong|moderate|weak"}],
  "counterarguments": [{"argument": "...", "response": "...", "mitigation": "..."}],
  "precedents": [{"case": "...", "relevance": "...", "outcome": "..."}],
  "recommendations": [...]
}`;

    const instructions = `${strategyPrompt}

Instrucciones específicas:
- Analiza el caso legal proporcionado
- Identifica las mejores vías de acción legal
- Proporciona argumentos jurídicos sólidos con fundamentos legales
- Anticipa posibles contraargumentos y cómo responder
- Incluye precedentes judiciales relevantes
- Proporciona recomendaciones estratégicas

Responde en formato JSON con esta estructura:
${jsonFormat}`;

    // Get reasoning effort from system config (strategy = high by default)
    const reasoningEffort = await getSystemConfig(supabase, 'reasoning_effort_strategy', 'high') as 'low' | 'medium' | 'high';
    
    // NOTE: Web search disabled when using jsonMode to avoid OpenAI API conflict
    const params = buildResponsesRequestParams(strategyModel, {
      input: `Analiza estratégicamente el siguiente caso legal:\n\n${caseDescription}\n\nResponde ÚNICAMENTE en formato JSON válido.`,
      instructions,
      maxOutputTokens: 8000,
      temperature: 0.3,
      jsonMode: true,
      store: false,
      reasoning: { effort: reasoningEffort }
    });

    const result = await callResponsesAPI(openaiApiKey, params);

    if (!result.success) {
      throw new Error(`Strategy analysis failed: ${result.error}`);
    }

    // Parse response
    let strategyResult;
    try {
      strategyResult = JSON.parse(result.text || '{}');
    } catch (e) {
      strategyResult = {
        legalActions: [{ action: "Análisis Manual Requerido", viability: "medium", description: "El caso requiere análisis detallado", requirements: ["Consulta con especialista"] }],
        legalArguments: [{ argument: "Requiere análisis especializado", foundation: "Análisis del caso", strength: "moderate" }],
        counterarguments: [{ argument: "Análisis pendiente", response: "Revisión detallada", mitigation: "Consultar especialista" }],
        precedents: [{ case: "Análisis pendiente", relevance: "Investigación específica", outcome: "Por determinar" }],
        recommendations: ["Consultar con especialista legal"]
      };
    }

    const resultData = {
      success: true,
      caseDescription,
      ...strategyResult,
      timestamp: new Date().toISOString()
    };

    // Save result if authenticated
    if (lawyerId) {
      await saveToolResult(supabase, lawyerId, 'strategy', { caseDescription }, strategyResult, {});
    }

    console.log('✅ Strategy analysis completed');

    return new Response(JSON.stringify(resultData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in strategy analysis:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
