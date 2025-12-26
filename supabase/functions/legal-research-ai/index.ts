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
      metadata: { ...metadata, status: 'completed', timestamp: new Date().toISOString() }
    });
    console.log(`✅ Saved ${toolType} result for lawyer ${lawyerId}`);
  } catch (error) {
    console.error('Error saving tool result:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Legal research function called - synchronous mode');
    
    // Get authentication
    const authHeader = req.headers.get('authorization');
    let lawyerId = null;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (authHeader) {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabaseClient = createClient(supabaseUrl, anonKey);
      const token = authHeader.replace('Bearer ', '');
      const { data: userData } = await supabaseClient.auth.getUser(token);
      lawyerId = userData.user?.id;
    }
    
    const { query } = await req.json();
    console.log('Received query:', query);

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lawyerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get configuration
    const researchModel = await getSystemConfig(supabase, 'research_ai_model', 'gpt-4o-mini');
    const researchPrompt = await getSystemConfig(supabase, 'research_system_prompt', '');
    
    if (!researchPrompt) {
      console.error('❌ research_system_prompt not configured in system_config');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuración faltante: research_system_prompt' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    logResponsesRequest(researchModel, 'legal-research-ai', true);

    // Load web search configuration
    let webSearchTool = null;
    if (supportsWebSearch(researchModel)) {
      webSearchTool = await loadWebSearchConfigAndBuildTool(supabase, 'research');
    }

    const jsonFormat = `{
  "findings": "Resumen estructurado de los hallazgos principales con referencias legales específicas",
  "sources": ["Lista de fuentes consultadas: leyes, sentencias, doctrina"],
  "conclusion": "Conclusión y recomendaciones basadas en la investigación",
  "keyPoints": ["Puntos clave identificados en la investigación"],
  "legalBasis": ["Fundamentos legales específicos: artículos, sentencias, conceptos"]
}`;

    const instructions = `${researchPrompt}

Instrucciones específicas para esta investigación:
- Analiza exhaustivamente la consulta jurídica proporcionada
- Busca jurisprudencia relevante de las altas cortes colombianas
- Identifica la normativa aplicable (leyes, decretos, resoluciones)
- Cita fuentes específicas con números de sentencia/ley cuando sea posible
- Proporciona un análisis estructurado y fundamentado

Responde en formato JSON con esta estructura:
${jsonFormat}`;

    // Get reasoning effort from system config
    const reasoningEffort = await getSystemConfig(supabase, 'research_reasoning_effort', 'medium') as 'low' | 'medium' | 'high';
    
    // Build request parameters
    const params = buildResponsesRequestParams(researchModel, {
      input: `Realiza una investigación jurídica exhaustiva sobre:\n\n${query}\n\nResponde ÚNICAMENTE en formato JSON válido.`,
      instructions,
      maxOutputTokens: 8000,
      temperature: 0.3,
      jsonMode: true,
      store: false,
      reasoning: { effort: reasoningEffort },
      webSearch: webSearchTool || undefined
    });

    console.log(`📡 Calling OpenAI with model: ${researchModel}`);
    const result = await callResponsesAPI(openaiApiKey, params);

    if (!result.success) {
      console.error('❌ OpenAI API error:', result.error);
      
      // Save failed result
      if (lawyerId) {
        await supabase.from('legal_tools_results').insert({
          lawyer_id: lawyerId,
          tool_type: 'research',
          input_data: { query },
          output_data: {},
          metadata: { status: 'failed', error: { message: result.error }, timestamp: new Date().toISOString() }
        });
      }
      
      throw new Error(`Research failed: ${result.error}`);
    }

    // Parse response
    let researchResult;
    try {
      researchResult = JSON.parse(result.text || '{}');
    } catch (e) {
      console.warn('Failed to parse JSON response, using raw text');
      researchResult = {
        findings: result.text || 'Investigación completada',
        sources: ['Fuentes legales consultadas'],
        conclusion: 'Análisis completado - ver hallazgos',
        keyPoints: [],
        legalBasis: []
      };
    }

    // Normalize response structure
    const normalizedResult = {
      findings: researchResult.findings || researchResult.content || 'Investigación completada',
      sources: researchResult.sources || researchResult.fuentes || ['Legislación Colombiana', 'Jurisprudencia'],
      conclusion: researchResult.conclusion || researchResult.conclusiones || 'Análisis completado',
      keyPoints: researchResult.keyPoints || researchResult.puntosClave || [],
      legalBasis: researchResult.legalBasis || researchResult.fundamentosLegales || []
    };

    // Save successful result
    if (lawyerId) {
      await saveToolResult(supabase, lawyerId, 'research', { query }, normalizedResult, { model: researchModel });
    }

    console.log('✅ Research completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        query,
        ...normalizedResult,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in legal-research-ai:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
