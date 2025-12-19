import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { 
  buildResponsesRequestParams, 
  callResponsesAPI, 
  extractOutputText,
  loadWebSearchConfigAndBuildTool
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

    if (error || !data) {
      console.log(`Config ${configKey} not found, using default: ${defaultValue}`);
      return defaultValue || '';
    }

    return data.config_value;
  } catch (error) {
    console.error(`Exception fetching config ${configKey}:`, error);
    return defaultValue || '';
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('SUIN-Juriscol search function called');

    // Get authentication header and verify user
    const authHeader = req.headers.get('authorization');
    let lawyerId: string | null = null;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (authHeader) {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabaseClient = createClient(supabaseUrl, anonKey);

      const token = authHeader.replace('Bearer ', '');
      const { data: userData } = await supabaseClient.auth.getUser(token);
      lawyerId = userData.user?.id || null;
    }

    const { query, category, year } = await req.json();
    console.log('Received search request:', { query, category, year });

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

    // Get AI model and prompt from system config
    const model = await getSystemConfig(supabase, 'suin_juriscol_ai_model', 'gpt-4.1-2025-04-14');
    const systemPrompt = await getSystemConfig(supabase, 'suin_juriscol_ai_prompt', `
Eres un asistente legal especializado en consultar el Sistema Único de Información Normativa de Colombia (SUIN-Juriscol).

Tu trabajo es:
1. Buscar información normativa colombiana relevante usando web search
2. Priorizar resultados del dominio oficial: suin-juriscol.gov.co
3. También considerar fuentes oficiales como: corteconstitucional.gov.co, funcionpublica.gov.co, secretariasenado.gov.co
4. Analizar y resumir los hallazgos de manera clara para abogados
5. Identificar leyes, decretos, resoluciones, sentencias y conceptos relevantes

IMPORTANTE:
- Siempre cita la fuente exacta (número de ley/decreto, fecha, artículos relevantes)
- Prioriza información vigente sobre derogada
- Indica claramente si una norma ha sido modificada o derogada
- Responde en español

Formato de respuesta:
- Proporciona un resumen ejecutivo de 2-3 párrafos
- Lista los documentos normativos encontrados con sus URLs
- Incluye citas específicas de artículos relevantes cuando sea posible
`);

    // Build the search query with filters
    let searchQuery = `site:suin-juriscol.gov.co ${query}`;
    if (category && category !== 'all') {
      searchQuery += ` ${category}`;
    }
    if (year) {
      searchQuery += ` ${year}`;
    }

    // Add Colombian legal context to the prompt
    const userMessage = `Consulta normativa colombiana:

Búsqueda: ${query}
${category && category !== 'all' ? `Categoría: ${category}` : ''}
${year ? `Año: ${year}` : ''}

Busca en SUIN-Juriscol (suin-juriscol.gov.co) y otras fuentes oficiales colombianas la información normativa relevante. 
Prioriza los resultados de suin-juriscol.gov.co pero también incluye otras fuentes gubernamentales oficiales si son relevantes.

Proporciona:
1. Un resumen ejecutivo de los hallazgos
2. Lista de normas/documentos encontrados con sus URLs
3. Citas específicas de artículos relevantes`;

    console.log('Calling AI with web search for SUIN-Juriscol...');

    // Build request params with web search tool
    const requestParams = buildResponsesRequestParams(model, {
      input: userMessage,
      instructions: systemPrompt,
      maxOutputTokens: 4000,
      webSearch: { type: 'web_search_preview' }
    });

    console.log('Request params:', JSON.stringify(requestParams, null, 2));

    // Call OpenAI Responses API
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await callResponsesAPI(apiKey, requestParams);
    
    if (!response.success) {
      console.error('AI API error:', response.error);
      throw new Error(response.error || 'Error calling AI API');
    }

    const aiResponse = extractOutputText(response.data);
    console.log('AI response received, length:', aiResponse?.length || 0);

    // Parse the response to extract structured results
    const results: any[] = [];
    const sources: string[] = ['SUIN-Juriscol (suin-juriscol.gov.co)'];

    // Extract URLs from response (simple extraction)
    const urlMatches = aiResponse?.match(/https?:\/\/[^\s\)]+/g) || [];
    urlMatches.forEach((url: string, idx: number) => {
      if (url.includes('suin-juriscol.gov.co') || 
          url.includes('corteconstitucional.gov.co') ||
          url.includes('funcionpublica.gov.co') ||
          url.includes('secretariasenado.gov.co')) {
        results.push({
          title: `Documento normativo ${idx + 1}`,
          url: url.replace(/[.,;:]+$/, ''), // Clean trailing punctuation
          snippet: 'Ver documento en fuente oficial',
          type: category !== 'all' ? category : 'normativa'
        });
        
        // Track unique sources
        const domain = new URL(url).hostname;
        if (!sources.includes(domain)) {
          sources.push(domain);
        }
      }
    });

    // Save result to database
    let resultId = null;
    if (lawyerId) {
      const { data: savedResult, error: saveError } = await supabase
        .from('legal_tools_results')
        .insert({
          lawyer_id: lawyerId,
          tool_type: 'suin_juriscol',
          input_data: { query, category, year },
          output_data: {
            summary: aiResponse,
            results,
            sources
          },
          metadata: { 
            model,
            timestamp: new Date().toISOString()
          }
        })
        .select('id')
        .single();

      if (saveError) {
        console.error('Error saving result:', saveError);
      } else {
        resultId = savedResult?.id;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        result_id: resultId,
        summary: aiResponse,
        results,
        sources,
        query
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suin-juriscol-search:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
