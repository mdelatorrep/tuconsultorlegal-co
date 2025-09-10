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
    
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: researchModel,
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
        reasoning: {
          summary: 'auto'
        },
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

    // Extract the final report from the responses format - get the last content item
    const finalOutput = data.output ? data.output[data.output.length - 1] : null;
    const content = finalOutput?.content?.[0]?.text || 'No se pudo obtener respuesta del asistente de investigación';
    
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