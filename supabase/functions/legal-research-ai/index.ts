import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

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
async function saveToolResult(supabase: any, lawyerId: string, toolType: string, inputData: any, outputData: any, metadata: any = {}): Promise<boolean> {
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
      throw new Error(`Failed to save tool result: ${error.message}`);
    } else {
      console.log(`✅ Successfully saved ${toolType} result`);
      return true;
    }
  } catch (error) {
    console.error('Exception saving tool result:', error);
    throw error;
  }
}

// Helper function to extract the last text content from OpenAI response
function extractFinalContent(responseData: any): string {
  if (!responseData.output || !Array.isArray(responseData.output)) {
    return 'No se pudo obtener respuesta del asistente de investigación';
  }
  
  // Find the last output item with text content
  for (let i = responseData.output.length - 1; i >= 0; i--) {
    const item = responseData.output[i];
    if (item.content && Array.isArray(item.content)) {
      for (const content of item.content) {
        if (content.type === 'text' && content.text) {
          return content.text;
        }
      }
    }
  }
  
  return 'No se pudo obtener respuesta del asistente de investigación';
}

// Helper function to implement exponential backoff for rate limits (optimized for Tier 1)
async function makeRequestWithRetry(url: string, options: any, maxRetries: number = 2): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Rate limit hit - check headers for retry info
        const retryAfter = response.headers.get('retry-after');
        const remainingTokens = response.headers.get('x-ratelimit-remaining-tokens');
        const resetTime = response.headers.get('x-ratelimit-reset-tokens');
        const limitTokens = response.headers.get('x-ratelimit-limit-tokens');
        
        console.log(`Rate limit hit (attempt ${attempt + 1}/${maxRetries + 1})`);
        console.log(`Retry-After: ${retryAfter}s, Remaining: ${remainingTokens}, Limit: ${limitTokens}, Reset: ${resetTime}`);
        
        if (attempt < maxRetries) {
          // For Tier 1: more conservative delays
          let delay: number;
          
          if (retryAfter) {
            // Use the exact retry-after time from headers (convert to ms)
            delay = parseInt(retryAfter) * 1000;
          } else {
            // Tier 1 optimized exponential backoff: start with 2s, then 8s
            delay = attempt === 0 ? 2000 : 8000;
          }
          
          // Cap maximum delay at 30 seconds for Tier 1
          delay = Math.min(delay, 30000);
          
          console.log(`Tier 1 rate limit - waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          // Final attempt failed - provide detailed error for Tier 1
          const errorText = await response.text();
          throw new Error(`Rate limit exceeded after ${maxRetries + 1} attempts. Tier 1 limits reached. ${errorText}`);
        }
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        // Tier 1: shorter delays for non-rate-limit errors
        const delay = attempt === 0 ? 1000 : 3000;
        console.log(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Request failed after all retries');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Legal research function called with request method:', req.method);
    
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

    // Get research AI model and prompt from system config - use deep research models
    const configModel = await getSystemConfig(supabase, 'research_ai_model', 'o4-mini-deep-research-2025-06-26');
    const researchPrompt = await getSystemConfig(
      supabase, 
      'research_ai_prompt', 
      'Eres un especialista en investigación jurídica colombiana. Analiza la consulta y proporciona respuestas detalladas basadas en legislación, jurisprudencia y normativa vigente con fuentes actualizadas.'
    );

    // Use only valid deep research models
    let researchModel = 'o4-mini-deep-research-2025-06-26'; // Default fallback
    if (configModel === 'o3-deep-research-2025-06-26') {
      researchModel = 'o3-deep-research-2025-06-26';
    } else if (configModel === 'o4-mini-deep-research-2025-06-26') {
      researchModel = 'o4-mini-deep-research-2025-06-26';
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Using deep research model: ${researchModel}`);

    // System message for Colombian legal research
    const systemMessage = `${researchPrompt}

Eres un experto investigador jurídico especializado en derecho colombiano. Tu tarea es producir un informe estructurado y respaldado por datos sobre la consulta jurídica del usuario.

INSTRUCCIONES ESPECÍFICAS:

Debes:
- Enfocarte en análisis ricos en datos: incluye figuras específicas, tendencias, estadísticas y resultados medibles (ej., cambios en la jurisprudencia, evolución normativa, impacto de reformas).
- Priorizar fuentes confiables y actualizadas: jurisprudencia reciente, normativa vigente, doctrina especializada, conceptos de organismos oficiales.
- Incluir citas en línea y devolver todos los metadatos de las fuentes.
- Analizar la consulta desde múltiples perspectivas del derecho colombiano:
  * Constitución Política de Colombia
  * Códigos (Civil, Comercial, Penal, Laboral, Procedimiento, etc.)
  * Jurisprudencia de Corte Constitucional, Corte Suprema de Justicia, Consejo de Estado
  * Normativa reglamentaria vigente
  * Conceptos de superintendencias y entidades regulatorias

Estructura tu respuesta con:
1. Análisis normativo detallado
2. Jurisprudencia aplicable con citas específicas
3. Implicaciones prácticas
4. Recomendaciones basadas en el marco jurídico vigente

Sé analítico, evita generalidades y asegúrate de que cada sección respalde el razonamiento con datos verificables que puedan informar decisiones jurídicas.`;

    // Use OpenAI Responses API with Deep Research and web search
    console.log('Starting deep research task...');
    
    const response = await makeRequestWithRetry('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: researchModel,
        max_output_tokens: 1500, // Reduced for Tier 1 to avoid TPM limits
        input: [
          {
            role: 'developer',
            content: [
              {
                type: 'input_text',
                text: systemMessage
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Consulta jurídica para investigación: ${query}`
              }
            ]
          }
        ],
        // reasoning: { summary: 'auto' }, // Removed - requires verified organization
        tools: [
          {
            type: 'web_search_preview'
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Deep Research API error:', errorText);
      throw new Error(`OpenAI Deep Research API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Deep research response received, processing results...');
    console.log('Response structure:', JSON.stringify(data, null, 2));

    // Extract the final report from the responses format using helper
    const content = extractFinalContent(data);
    
    // Extract citations/annotations if available
    const annotations = finalOutput?.content?.[0]?.annotations || [];
    const webSearchCalls = data.output?.filter(item => item.type === 'web_search_call') || [];
    const reasoningSteps = data.output?.filter(item => item.type === 'reasoning') || [];
    
    console.log(`Deep research completed with:
    - ${annotations.length} citations
    - ${webSearchCalls.length} web searches  
    - ${reasoningSteps.length} reasoning steps`);

    // Process sources from annotations and web search calls
    const sources = [];
    
    // Add sources from annotations (inline citations)
    annotations.forEach((annotation, index) => {
      if (annotation.url && annotation.title) {
        sources.push({
          title: annotation.title,
          url: annotation.url,
          type: 'citation',
          index: index + 1
        });
      }
    });
    
    // Add sources from web search calls
    webSearchCalls.forEach((searchCall, index) => {
      if (searchCall.action?.query) {
        sources.push({
          title: `Búsqueda: "${searchCall.action.query}"`,
          type: 'search',
          status: searchCall.status || 'completed',
          index: sources.length + 1
        });
      }
    });
    
    // Fallback sources if none found
    if (sources.length === 0) {
      sources.push({
        title: "Investigación jurídica colombiana con búsqueda web",
        type: 'general',
        index: 1
      });
    }

    // Structure the findings and conclusion
    let findings = content;
    let conclusion = "Consulte con un especialista para casos específicos.";
    
    // Try to extract conclusion from content if possible
    const conclusionMatch = content.match(/conclusi[óo]n[:\s]*(.*?)(?:\n|$)/i);
    if (conclusionMatch) {
      conclusion = conclusionMatch[1].trim();
    } else if (content.length > 500) {
      // Use last paragraph as conclusion for long responses
      const paragraphs = content.split('\n\n').filter(p => p.trim());
      if (paragraphs.length > 1) {
        conclusion = paragraphs[paragraphs.length - 1].trim();
      }
    }

    const resultData = {
      success: true,
      findings,
      sources,
      conclusion,
      query,
      timestamp: new Date().toISOString(),
      metadata: {
        model: researchModel,
        citations_count: annotations.length,
        searches_count: webSearchCalls.length,
        reasoning_steps: reasoningSteps.length
      }
    };

    // Save result to database if user is authenticated
    if (lawyerId) {
      await saveToolResult(
        supabase,
        lawyerId,
        'research',
        { query },
        { findings, sources, conclusion },
        { 
          timestamp: new Date().toISOString(),
          model: researchModel,
          citations_count: annotations.length,
          searches_count: webSearchCalls.length
        }
      );
    }

    return new Response(
      JSON.stringify(resultData),
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

// Note: Using OpenAI Deep Research API with Responses endpoint for enhanced web search capabilities
// Background mode enabled for long-running research tasks with web search and citation support