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
  "legalActions": [{"action": "string", "viability": "high|medium|low", "description": "string", "requirements": ["string"]}],
  "legalArguments": [{"argument": "string", "foundation": "string", "strength": "strong|moderate|weak"}],
  "counterarguments": [{"argument": "string", "response": "string", "mitigation": "string"}],
  "precedents": [{"case": "string", "relevance": "string", "outcome": "string"}],
  "recommendations": ["string"]
}`;

    const instructions = `${strategyPrompt}

INSTRUCCIONES CRÍTICAS:
1. Analiza el caso y genera MÁXIMO 3 elementos por categoría para mantener respuesta concisa
2. Sé breve pero sustancial en cada descripción
3. Responde ÚNICAMENTE en JSON válido sin explicaciones adicionales

Estructura requerida:
${jsonFormat}`;

    // CRITICAL: For JSON generation, we MUST use 'low' reasoning effort to maximize output tokens
    // High effort causes tokens to be exhausted on internal reasoning, leaving empty/incomplete JSON output
    const configuredEffort = await getSystemConfig(supabase, 'reasoning_effort_strategy', 'low') as 'low' | 'medium' | 'high';
    const effectiveEffort = 'low'; // Force low for JSON mode to prevent incomplete responses
    
    if (configuredEffort !== 'low') {
      console.log(`[Strategy] Configured effort is '${configuredEffort}' but using 'low' for JSON generation`);
    }
    
    // NOTE: Web search disabled when using jsonMode to avoid OpenAI API conflict
    const params = buildResponsesRequestParams(strategyModel, {
      input: `Caso legal para análisis estratégico:\n\n${caseDescription}\n\nResponde en JSON.`,
      instructions,
      maxOutputTokens: 16000,
      temperature: 0.3,
      jsonMode: true,
      store: false,
      reasoning: { effort: effectiveEffort }
    });

    const result = await callResponsesAPI(openaiApiKey, params);

    // Handle incomplete responses (max_output_tokens exceeded)
    if (result.incomplete) {
      console.warn(`Strategy analysis incomplete: ${result.incompleteReason}`);
      // Try to parse partial content if available
      if (result.text) {
        try {
          const partialResult = JSON.parse(result.text);
          console.log('Parsed partial strategy result');
          return new Response(JSON.stringify({
            success: true,
            caseDescription,
            ...partialResult,
            partial: true,
            timestamp: new Date().toISOString()
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (e) {
          console.error('Could not parse partial JSON');
        }
      }
    }

    if (!result.success && !result.text) {
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
