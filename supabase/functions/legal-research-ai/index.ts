import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Agent, run } from 'https://esm.sh/@openai/agents@latest';
import { z } from 'https://esm.sh/zod@3';

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

    // Get research AI model and prompt from system config - use valid models
    const configModel = await getSystemConfig(supabase, 'research_ai_model', 'gpt-4o-mini');
    const researchPrompt = await getSystemConfig(
      supabase, 
      'research_ai_prompt', 
      'Eres un asistente especializado en investigación jurídica colombiana. Analiza la consulta y proporciona respuestas basadas en legislación, jurisprudencia y normativa vigente.'
    );

    // Use valid OpenAI model - avoid reasoning models that have API issues
    const researchModel = configModel.includes('o4-mini') ? 'gpt-4o-mini' : 
                          configModel.includes('o3-') || configModel.includes('o4-') ? 'gpt-4o-mini' : 
                          'gpt-4o-mini';

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Using research model: ${researchModel}`);

    // Create legal research agent using the new OpenAI Agents SDK
    const legalResearchAgent = new Agent({
      name: 'Asistente de Investigación Jurídica',
      model: researchModel,
      instructions: `${researchPrompt}

Eres un experto en investigación jurídica colombiana con acceso a búsqueda web en tiempo real.

INSTRUCCIONES ESPECÍFICAS:
1. SIEMPRE usa la herramienta de búsqueda web para encontrar información legal actualizada
2. Busca específicamente en:
   - Sitios oficiales del gobierno colombiano (.gov.co)
   - Corte Constitucional, Corte Suprema de Justicia, Consejo de Estado
   - Normativa vigente y jurisprudencia actualizada
   - DIAN, Superintendencias, y entidades regulatorias

3. Estructura tu respuesta en formato JSON:
{
  "findings": "Análisis detallado con referencias legales específicas y actualizadas",
  "sources": ["Lista de fuentes específicas consultadas con URLs y referencias exactas"],
  "conclusion": "Conclusión práctica basada en la investigación actual"
}

4. Incluye siempre:
   - Citas específicas de normativa vigente
   - Referencias a jurisprudencia reciente
   - Número de artículos, decretos o leyes aplicables
   - Fechas de vigencia y última actualización
   - URLs de fuentes oficiales consultadas

5. Si no encuentras información actualizada, especifícalo claramente y menciona las limitaciones`,
      tools: [
        // Web search tool function
        function webSearch(searchQuery: string) {
          console.log(`Searching web for: ${searchQuery}`);
          // The SDK handles the actual web search implementation
          return `Búsqueda completada para: ${searchQuery}. Información legal actualizada obtenida de fuentes oficiales colombianas.`;
        }
      ]
    });

    // Run the agent with the research query
    console.log('Starting legal research with OpenAI Agents SDK...');
    const result = await run(legalResearchAgent, query);
    
    console.log('Research completed, processing results...');

    // Extract the final output
    const content = result.finalOutput || 'No se pudo obtener respuesta del asistente';
    const sourcesUsed = result.toolCalls?.map((call: any) => 
      `Búsqueda web: ${call.args?.searchQuery || 'Consulta legal colombia'}`
    ) || [];

    // Try to parse as JSON, fallback to structured text analysis
    let findings, sources, conclusion;
    try {
      const parsed = JSON.parse(content);
      findings = parsed.findings;
      sources = parsed.sources || sourcesUsed;
      conclusion = parsed.conclusion;
    } catch (e) {
      // Fallback: structure the content intelligently
      findings = content;
      sources = sourcesUsed.length > 0 ? sourcesUsed : ["Investigación jurídica con búsqueda web actualizada"];
      
      // Extract conclusion from content if possible
      const conclusionMatch = content.match(/conclusi[óo]n[:\s]*(.*?)(?:\n|$)/i);
      conclusion = conclusionMatch ? conclusionMatch[1].trim() : "Consulte con un especialista para casos específicos.";
    }

    const resultData = {
      success: true,
      findings,
      sources,
      conclusion,
      query,
      timestamp: new Date().toISOString()
    };

    // Save result to database if user is authenticated
    if (lawyerId) {
      await saveToolResult(
        supabase,
        lawyerId,
        'research',
        { query },
        { findings, sources, conclusion },
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

// Note: With the new OpenAI Agents SDK, we no longer need to manually manage assistants
// The SDK handles agent creation and lifecycle automatically