import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  buildResponsesRequestParams, 
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Legal research function called - async mode');
    
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

    // Build request parameters - JSON mode is incompatible with web search
    const useJsonMode = !webSearchTool;
    
    // Get reasoning effort from system config
    const reasoningEffort = await getSystemConfig(supabase, 'reasoning_effort_research', 'high') as 'low' | 'medium' | 'high';
    
    const params = buildResponsesRequestParams(researchModel, {
      input: `Realiza una investigación jurídica exhaustiva sobre:\n\n${query}\n\n${useJsonMode ? 'Responde ÚNICAMENTE en formato JSON válido.' : 'Estructura tu respuesta con secciones claras: Hallazgos, Fuentes, Conclusión, Puntos Clave y Fundamentos Legales.'}`,
      instructions,
      maxOutputTokens: 8000,
      temperature: 0.3,
      jsonMode: useJsonMode,
      store: false,
      reasoning: { effort: reasoningEffort },
      webSearch: webSearchTool || undefined
    });

    // Add background: true for async processing
    const requestBody = { ...params, background: true };

    console.log(`📡 Starting background research with model: ${researchModel}`);

    // Start the background request
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const openaiResponse = await response.json();
    const responseId = openaiResponse.id;
    const initialStatus = openaiResponse.status;

    console.log(`✅ Background task started: ${responseId}, status: ${initialStatus}`);

    // Create async task record
    const { data: taskData, error: taskError } = await supabase
      .from('async_research_tasks')
      .insert({
        lawyer_id: lawyerId,
        openai_response_id: responseId,
        query: query,
        status: 'pending',
        model_used: researchModel
      })
      .select()
      .single();

    if (taskError) {
      console.error('❌ Error creating task record:', taskError);
      throw new Error('Failed to create task record');
    }

    console.log(`📋 Created task: ${taskData.id}`);

    // Return immediately with task ID for frontend polling
    return new Response(
      JSON.stringify({
        success: true,
        async: true,
        taskId: taskData.id,
        status: 'pending',
        message: 'Investigación iniciada. El frontend realizará polling para obtener resultados.'
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
