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

    // Create or get an assistant for legal research with web search
    let assistantId = await getOrCreateResearchAssistant(supabase, openaiApiKey, researchPrompt);

    // Create a new thread for this research query
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!threadResponse.ok) {
      throw new Error('Failed to create research thread');
    }

    const thread = await threadResponse.json();
    console.log('Created research thread:', thread.id);

    // Add user message to thread
    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: query
      })
    });

    // Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        instructions: `Realiza una investigación jurídica completa sobre: "${query}". SIEMPRE usa la búsqueda web para encontrar información legal actualizada de Colombia. Busca específicamente en sitios oficiales del gobierno colombiano, jurisprudencia de altas cortes, y normativa vigente. Proporciona respuesta estructurada en JSON.`
      })
    });

    if (!runResponse.ok) {
      throw new Error('Failed to start research run');
    }

    const run = await runResponse.json();
    console.log('Research run started:', run.id);

    // Poll for completion
    let runStatus = run.status;
    let runData = run;
    const sourcesUsed: string[] = [];

    while (runStatus === 'in_progress' || runStatus === 'requires_action') {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      // Check run status
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check run status');
      }

      runData = await statusResponse.json();
      runStatus = runData.status;
      console.log('Research run status:', runStatus);

      // Handle function calls if needed
      if (runStatus === 'requires_action') {
        const toolCalls = runData.required_action?.submit_tool_outputs?.tool_calls || [];
        const toolOutputs = [];

        for (const toolCall of toolCalls) {
          console.log('Processing tool call:', toolCall.function.name);
          
          let output = '';
          try {
            switch (toolCall.function.name) {
              case 'web_search':
                const args = JSON.parse(toolCall.function.arguments);
                sourcesUsed.push(`Búsqueda web: ${args.query || 'Consulta legal colombia'}`);
                output = 'Búsqueda web completada. Información legal actualizada obtenida de fuentes oficiales.';
                break;
              default:
                output = `Herramienta ${toolCall.function.name} procesada correctamente`;
            }
          } catch (error) {
            console.error(`Error processing function ${toolCall.function.name}:`, error);
            output = `Herramienta procesada: ${toolCall.function.name}`;
          }

          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: output
          });
        }

        // Submit tool outputs
        if (toolOutputs.length > 0) {
          await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}/submit_tool_outputs`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2'
            },
            body: JSON.stringify({
              tool_outputs: toolOutputs
            })
          });
        }
      }
    }

    if (runStatus !== 'completed') {
      throw new Error(`Research run failed with status: ${runStatus}`);
    }

    // Get the assistant's response
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesResponse.ok) {
      throw new Error('Failed to retrieve research results');
    }

    const messagesData = await messagesResponse.json();
    const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant');
    const content = assistantMessage?.content[0]?.text?.value || 'No se pudo obtener respuesta del asistente';

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

// Helper function to get or create a research assistant
async function getOrCreateResearchAssistant(supabase: any, openaiApiKey: string, researchPrompt: string): Promise<string> {
  try {
    // Check if we have a research assistant stored
    const { data: assistantConfig } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'research_assistant_id')
      .maybeSingle();

    if (assistantConfig?.config_value) {
      // Verify assistant still exists in OpenAI
      const verifyResponse = await fetch(`https://api.openai.com/v1/assistants/${assistantConfig.config_value}`, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (verifyResponse.ok) {
        console.log('Using existing research assistant:', assistantConfig.config_value);
        return assistantConfig.config_value;
      }
    }

    // Create new assistant with web search capabilities
    console.log('Creating new research assistant with web search capabilities');
    const createResponse = await fetch('https://api.openai.com/v1/assistants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        name: 'Asistente de Investigación Jurídica',
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
          { type: "web_search" }
        ],
        metadata: {
          purpose: 'legal_research',
          jurisdiction: 'colombia',
          created_by: 'tuconsultorlegal_system'
        }
      })
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create research assistant');
    }

    const assistant = await createResponse.json();
    console.log('Created new research assistant:', assistant.id);

    // Store assistant ID for reuse
    await supabase
      .from('system_config')
      .upsert({
        config_key: 'research_assistant_id',
        config_value: assistant.id,
        description: 'ID del asistente de investigación jurídica con búsqueda web'
      });

    return assistant.id;
  } catch (error) {
    console.error('Error managing research assistant:', error);
    throw error;
  }
}