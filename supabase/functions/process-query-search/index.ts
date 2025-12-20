import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { 
  buildResponsesRequestParams, 
  callResponsesAPI, 
  extractOutputText
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

const DEFAULT_SYSTEM_PROMPT = `Eres un asistente legal especializado en consultas de procesos judiciales de Colombia.

Tu trabajo es:
1. Proporcionar información contextual sobre procesos judiciales colombianos
2. Explicar estados procesales, términos y procedimientos
3. Buscar información relevante sobre legislación procesal colombiana
4. Orientar sobre cómo interpretar la información de un proceso judicial
5. Proporcionar links directos al portal oficial de consulta de procesos

FUENTES OFICIALES A CONSULTAR:
- consultaprocesos.ramajudicial.gov.co - Portal oficial de consulta de procesos
- ramajudicial.gov.co - Página principal de la Rama Judicial
- cortesuprema.gov.co - Corte Suprema de Justicia
- consejodeestado.gov.co - Consejo de Estado
- corteconstitucional.gov.co - Corte Constitucional

INFORMACIÓN SOBRE NÚMEROS DE RADICACIÓN:
El número de radicación de un proceso judicial en Colombia tiene 23 dígitos con el siguiente formato:
- Dígitos 1-2: Código del departamento
- Dígitos 3-5: Código del municipio
- Dígitos 6-7: Código de la especialidad (Civil: 31, Penal: 60, Laboral: 41, Familia: 32, etc.)
- Dígitos 8-10: Código del despacho
- Dígitos 11-14: Año de radicación
- Dígitos 15-19: Número consecutivo del proceso
- Dígitos 20-21: Tipo de proceso
- Dígitos 22-23: Instancia

IMPORTANTE:
- Siempre incluye el link directo al portal oficial: https://consultaprocesos.ramajudicial.gov.co/procesos/Index
- Explica los estados procesales comunes (admisión, traslado, audiencia, sentencia, etc.)
- Indica tiempos procesales típicos según el tipo de proceso
- Si el usuario proporciona un número de radicación, explica qué información se puede extraer de él
- Responde en español colombiano profesional

Formato de respuesta:
- Proporciona información clara y estructurada
- Incluye links relevantes a fuentes oficiales
- Si es una consulta de seguimiento, mantén el contexto de la conversación anterior`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Process query search function called');

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

    const { 
      queryType, 
      radicado, 
      idType, 
      idNumber, 
      personName, 
      city, 
      processType,
      followUpQuery,
      conversationContext, 
      isFollowUp, 
      originalQuery 
    } = await req.json();

    console.log('Received process query request:', { queryType, isFollowUp, processType });

    if (!lawyerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get AI model and prompt from system config
    const model = await getSystemConfig(supabase, 'process_query_ai_model', 'gpt-4.1-2025-04-14');
    const systemPrompt = await getSystemConfig(supabase, 'process_query_ai_prompt', DEFAULT_SYSTEM_PROMPT);

    // Build the user message based on query type
    let userMessage: string;
    
    if (isFollowUp && conversationContext) {
      userMessage = `Contexto de la conversación anterior:
${conversationContext}

Nueva pregunta del usuario: ${followUpQuery}

Basándote en el contexto de la conversación anterior sobre "${originalQuery || 'proceso judicial'}", responde a esta nueva pregunta.
Si necesitas buscar información adicional, hazlo usando web search enfocándote en fuentes oficiales de la Rama Judicial de Colombia.
Mantén tus respuestas concisas pero informativas.`;
    } else {
      // Build query based on type
      let queryDetails = '';
      
      switch (queryType) {
        case 'radicado':
          queryDetails = `Número de radicación del proceso: ${radicado}

Por favor analiza este número de radicación y proporciona:
1. Decodificación del número (departamento, municipio, especialidad, despacho, año, etc.)
2. Información sobre el tipo de proceso que indica
3. Link directo para consultar el estado actual en el portal oficial
4. Explicación de cómo interpretar los estados del proceso
5. Tiempos procesales típicos para este tipo de proceso`;
          break;
          
        case 'identification':
          queryDetails = `Consulta por identificación:
- Tipo de documento: ${idType}
- Número: ${idNumber}

Proporciona información sobre:
1. Cómo consultar procesos asociados a esta identificación en el portal oficial
2. Link directo al portal de consulta de procesos
3. Qué tipo de información se puede obtener
4. Consideraciones de privacidad y acceso a la información`;
          break;
          
        case 'name':
          queryDetails = `Consulta por nombre:
- Nombre/Razón social: ${personName}
${city ? `- Ciudad: ${city}` : ''}

Proporciona información sobre:
1. Cómo buscar procesos asociados a este nombre en el portal oficial
2. Link directo al portal de consulta
3. Limitaciones de las búsquedas por nombre
4. Opciones alternativas de consulta`;
          break;
          
        default:
          queryDetails = 'Consulta general sobre procesos judiciales en Colombia';
      }

      userMessage = `Consulta de proceso judicial colombiano:

${queryDetails}

${processType ? `Tipo de proceso de interés: ${processType}` : ''}

Busca información relevante en fuentes oficiales de la Rama Judicial de Colombia.
Incluye siempre el link directo al portal oficial de consulta: https://consultaprocesos.ramajudicial.gov.co/procesos/Index`;
    }

    console.log('Calling AI with web search for process query...');

    // Build request params with web search tool
    const requestParams = buildResponsesRequestParams(model, {
      input: userMessage,
      instructions: systemPrompt,
      maxOutputTokens: 4000,
      webSearch: { type: 'web_search_preview' }
    });

    console.log('Request params built successfully');

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
    const sources: string[] = ['Rama Judicial de Colombia (ramajudicial.gov.co)'];

    // Extract URLs from response
    const urlMatches = aiResponse?.match(/https?:\/\/[^\s\)]+/g) || [];
    urlMatches.forEach((url: string, idx: number) => {
      const cleanUrl = url.replace(/[.,;:]+$/, '');
      if (cleanUrl.includes('ramajudicial.gov.co') || 
          cleanUrl.includes('consultaprocesos') ||
          cleanUrl.includes('cortesuprema.gov.co') ||
          cleanUrl.includes('consejodeestado.gov.co') ||
          cleanUrl.includes('corteconstitucional.gov.co')) {
        results.push({
          title: `Fuente oficial ${idx + 1}`,
          url: cleanUrl,
          snippet: 'Ver información en fuente oficial',
          type: processType || 'judicial'
        });
        
        try {
          const domain = new URL(cleanUrl).hostname;
          if (!sources.includes(domain)) {
            sources.push(domain);
          }
        } catch (e) {
          // Ignore URL parse errors
        }
      }
    });

    // Always include the main portal link
    if (!results.some(r => r.url.includes('consultaprocesos'))) {
      results.unshift({
        title: 'Portal de Consulta de Procesos',
        url: 'https://consultaprocesos.ramajudicial.gov.co/procesos/Index',
        snippet: 'Portal oficial para consulta de procesos judiciales',
        type: 'portal'
      });
    }

    // Build query string for logging
    let queryString = '';
    switch (queryType) {
      case 'radicado':
        queryString = `Radicado: ${radicado}`;
        break;
      case 'identification':
        queryString = `${idType}: ${idNumber}`;
        break;
      case 'name':
        queryString = `Nombre: ${personName}${city ? `, Ciudad: ${city}` : ''}`;
        break;
      default:
        queryString = followUpQuery || 'Consulta general';
    }

    // Save result to database
    let resultId = null;
    if (lawyerId && !isFollowUp) {
      const { data: savedResult, error: saveError } = await supabase
        .from('legal_tools_results')
        .insert({
          lawyer_id: lawyerId,
          tool_type: 'process_query',
          input_data: { 
            queryType, 
            query: queryString,
            radicado, 
            idType, 
            idNumber, 
            personName, 
            city, 
            processType 
          },
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
        query: queryString
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-query-search:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
