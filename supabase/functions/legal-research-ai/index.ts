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

// Handle webhook notifications from OpenAI when background research completes
async function handleWebhook(req: Request): Promise<Response> {
  try {
    console.log('Webhook received for research completion');
    
    // Verify webhook secret for security
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET') || 'default-secret';
    
    if (webhookSecret !== expectedSecret) {
      console.error('Unauthorized webhook request - invalid secret');
      return new Response('Unauthorized', { status: 401 });
    }
    
    const webhookData = await req.json();
    console.log('Webhook data:', JSON.stringify(webhookData, null, 2));
    
    // Check for duplicate processing (idempotency)
    const taskId = webhookData.id;
    if (!taskId) {
      console.error('Webhook missing task ID');
      return new Response('Bad Request: Missing task ID', { status: 400 });
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if this task was already processed
    const { data: existingResult } = await supabase
      .from('legal_tools_results')
      .select('id')
      .eq('metadata->>task_id', taskId)
      .in('tool_type', ['research_completed', 'research_failed'])
      .limit(1);
    
    if (existingResult && existingResult.length > 0) {
      console.log(`Task ${taskId} already processed, ignoring duplicate webhook`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Extract research ID from headers
    const researchId = req.headers.get('x-research-id');
    const lawyerId = researchId?.split('|')[0]; // Updated delimiter
    
    if (webhookData.status === 'completed' && webhookData.response) {
      console.log('Processing completed research task');
      
      // Extract the final content using helper
      const content = extractFinalContent(webhookData.response);
      
      // Extract sources and metadata
      const finalOutput = webhookData.response.output?.[webhookData.response.output.length - 1];
      const annotations = finalOutput?.content?.[0]?.annotations || [];
      const webSearchCalls = webhookData.response.output?.filter(item => item.type === 'web_search_call') || [];
      const reasoningSteps = webhookData.response.output?.filter(item => item.type === 'reasoning') || [];
      
      // Process sources
      const sources = [];
      
      // Add sources from annotations
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
      
      // Extract conclusion
      let conclusion = "Consulte con un especialista para casos específicos.";
      const conclusionMatch = content.match(/conclusi[óo]n[:\s]*(.*?)(?:\n|$)/i);
      if (conclusionMatch) {
        conclusion = conclusionMatch[1].trim();
      } else if (content.length > 500) {
        const paragraphs = content.split('\n\n').filter(p => p.trim());
        if (paragraphs.length > 1) {
          conclusion = paragraphs[paragraphs.length - 1].trim();
        }
      }
      
      // Save completed research results
      if (lawyerId && lawyerId !== 'anonymous') {
        await saveToolResult(
          supabase,
          lawyerId,
          'research_completed',
          { 
            task_id: webhookData.id,
            original_query: webhookData.metadata?.query || 'N/A'
          },
          { 
            findings: content,
            sources,
            conclusion
          },
          { 
            timestamp: new Date().toISOString(),
            model: webhookData.model || 'o4-mini-deep-research-2025-06-26',
            citations_count: annotations.length,
            searches_count: webSearchCalls.length,
            reasoning_steps: reasoningSteps.length,
            completion_time: new Date().toISOString(),
            background_mode: true
          }
        );
        
        console.log(`✅ Research results saved for lawyer: ${lawyerId}`);
      }
    } else if (webhookData.status === 'failed') {
      console.error('Research task failed:', webhookData.error);
      
      // Save failure record
      if (lawyerId && lawyerId !== 'anonymous') {
        await saveToolResult(
          supabase,
          lawyerId,
          'research_failed',
          { 
            task_id: webhookData.id,
            error: webhookData.error
          },
          { 
            error: webhookData.error,
            failed_at: new Date().toISOString()
          },
          { 
            timestamp: new Date().toISOString(),
            background_mode: true
          }
        );
      }
    }
    
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

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

// Enhanced function to extract content from various OpenAI response formats
function extractFinalContent(responseData: any): string {
  if (!responseData || !responseData.output || !Array.isArray(responseData.output)) {
    return 'No se pudo obtener respuesta del asistente de investigación';
  }
  
  // Find the last output item with text content (support multiple formats)
  for (let i = responseData.output.length - 1; i >= 0; i--) {
    const item = responseData.output[i];
    if (!item.content) continue;
    
    for (const content of item.content) {
      // Support various content types
      if (content.type === 'message' && content.text) {
        return content.text;
      }
      if ((content.type === 'text' || content.type === 'input_text') && (content.text || content.value)) {
        return content.text || content.value;
      }
    }
  }
  
  return 'No se pudo obtener respuesta del asistente de investigación';
}

// Helper function to check TPM usage and decide if request should proceed
function analyzeTokenUsage(errorText: string): { limit: number, used: number, requested: number, shouldQueue: boolean } {
  const limitMatch = errorText.match(/Limit\s+(\d+)/);
  const usedMatch = errorText.match(/Used\s+(\d+)/);
  const requestedMatch = errorText.match(/Requested\s+(\d+)/);
  
  const limit = limitMatch ? parseInt(limitMatch[1]) : 200000; // Default Tier 1 limit
  const used = usedMatch ? parseInt(usedMatch[1]) : 0;
  const requested = requestedMatch ? parseInt(requestedMatch[1]) : 0;
  
  const shouldQueue = (used + requested) > limit;
  
  console.log(`Token analysis: Limit=${limit}, Used=${used}, Requested=${requested}, ShouldQueue=${shouldQueue}`);
  return { limit, used, requested, shouldQueue };
}

// Sleep utility with jitter
function sleep(ms: number): Promise<void> {
  const jitter = Math.random() * 1000; // Add up to 1s jitter
  return new Promise(resolve => setTimeout(resolve, ms + jitter));
}

// Enhanced retry function with improved rate limit handling
async function makeRequestWithRetry(url: string, options: any, maxRetries: number = 5): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const errorText = await response.text();
        const tokenAnalysis = analyzeTokenUsage(errorText);
        
        // Get headers for smart retry timing
        const retryAfter = response.headers.get('retry-after');
        const resetTokens = response.headers.get('x-ratelimit-reset-tokens');
        const remainingTokens = response.headers.get('x-ratelimit-remaining-tokens');
        const limitTokens = response.headers.get('x-ratelimit-limit-tokens');
        
        console.log(`Rate limit 429 (attempt ${attempt + 1}/${maxRetries + 1})`);
        console.log(`Headers - Retry-After: ${retryAfter}s, Remaining: ${remainingTokens}, Limit: ${limitTokens}, Reset: ${resetTokens}`);
        console.log(`Token analysis:`, tokenAnalysis);
        
        if (attempt === maxRetries) {
          throw new Error(`Rate limit exceeded after ${maxRetries + 1} attempts. ${errorText}`);
        }
        
        // Calculate optimal wait time
        let waitMs = 0;
        
        if (retryAfter) {
          // Prefer retry-after header (in seconds)
          waitMs = parseInt(retryAfter, 10) * 1000;
        } else if (resetTokens) {
          // Calculate wait time from reset timestamp
          const nowSec = Math.floor(Date.now() / 1000);
          const resetSec = parseInt(resetTokens, 10);
          waitMs = Math.max(1000, (resetSec - nowSec) * 1000);
        } else {
          // Exponential backoff with jitter for deep research (longer delays)
          waitMs = Math.min(60000, (2 ** attempt) * 2000); // Start at 2s, cap at 60s
        }
        
        console.log(`Rate limit - waiting ${waitMs}ms before retry (attempt ${attempt + 1})`);
        await sleep(waitMs);
        continue;
      }
      
      // For other statuses, return the response (caller checks .ok)
      return response;
      
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        // Shorter waits for non-rate-limit errors
        const waitMs = attempt === 0 ? 1000 : 3000;
        console.log(`Request error, attempt ${attempt + 1}/${maxRetries + 1}. Retrying in ${waitMs}ms`, error);
        await sleep(waitMs);
        continue;
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

  const url = new URL(req.url);
  
  // Handle webhook endpoint for background completion
  if (url.pathname.endsWith('/webhook') && req.method === 'POST') {
    return handleWebhook(req);
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

    // Force use of o4-mini-deep-research as recommended
    const researchModel = 'o4-mini-deep-research-2025-06-26';

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Using deep research model: ${researchModel}`);

    // Optimized system message (reduced tokens for TPM efficiency)
    const systemMessage = `${researchPrompt}

Experto en derecho colombiano. Produce informe estructurado con:

1. Marco normativo (Constitución, códigos, decretos vigentes)
2. Jurisprudencia reciente (Corte Constitucional, CSJ, Consejo de Estado)  
3. Aplicación práctica y recomendaciones

Incluye citas específicas y fuentes verificables. Enfócate en análisis concreto con datos medibles.`;

    // Use OpenAI Responses API with Deep Research and web search in background mode
    console.log('Starting deep research task in background mode...');
    
    const response = await makeRequestWithRetry('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: researchModel,
        max_output_tokens: 1000, // Optimized for TPM efficiency on Tier 1
        background: true, // Enable background mode for long-running tasks (5-30 min)
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
        tools: [
          {
            type: 'web_search' // Use stable web_search instead of preview
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
    console.log('Background research task initiated:', JSON.stringify(data, null, 2));

    // Handle the background task response
    if (data.id) {
      console.log(`✅ Background research task started with ID: ${data.id}`);
      
      // Save the initiation record for tracking
      if (lawyerId) {
        await saveToolResult(
          supabase,
          lawyerId,
          'research_initiated',
          { 
            query,
            task_id: data.id
          },
          { 
            status: 'initiated',
            estimated_completion_time: 30 // minutes
          },
          { 
            task_id: data.id,
            timestamp: new Date().toISOString(),
            model: researchModel,
            background_mode: true
          }
        );
        
        console.log(`✅ Research initiation saved for lawyer: ${lawyerId}`);
      }
      
      // Set up background polling to check for completion
      EdgeRuntime.waitUntil(pollForCompletion(data.id, lawyerId, query, supabase));
      
      return new Response(JSON.stringify({
        success: true,
        task_id: data.id,
        status: 'initiated',
        estimated_time: '5-30 minutos',
        message: 'La investigación se está procesando en background. Recibirás una notificación cuando esté completa.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fallback: if not background mode, handle immediate response
    if (data.response) {
      const content = extractFinalContent(data.response);
      
      // Extract citations/annotations if available
      const finalOutput = data.response.output?.[data.response.output.length - 1];
      const annotations = finalOutput?.content?.[0]?.annotations || [];
      const webSearchCalls = data.response.output?.filter(item => item.type === 'web_search_call') || [];
      const reasoningSteps = data.response.output?.filter(item => item.type === 'reasoning') || [];
      
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
    }

    // If no valid response
    console.log('❌ No valid response from OpenAI API');
    return new Response(JSON.stringify({
      success: false,
      error: 'No se recibió una respuesta válida del servicio de investigación'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in legal-research-ai function:', error);
    
    // Enhanced error handling for rate limits and token issues
    let errorMessage = 'Error interno del servidor';
    let statusCode = 500;
    
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      errorMessage = 'Límite de velocidad alcanzado. Intenta nuevamente en unos minutos.';
      statusCode = 429;
    } else if (error.message.includes('token')) {
      errorMessage = 'Error de autenticación con el servicio de IA. Contacta al administrador.';
      statusCode = 401;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Tiempo de espera agotado. La consulta puede ser muy compleja.';
      statusCode = 408;
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      details: error.message
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Background polling function to check task completion
async function pollForCompletion(taskId: string, lawyerId: string | null, query: string, supabase: any): Promise<void> {
  const maxPollingTime = 35 * 60 * 1000; // 35 minutes
  const pollInterval = 30 * 1000; // 30 seconds
  const startTime = Date.now();
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  console.log(`Starting background polling for task: ${taskId}`);
  
  while (Date.now() - startTime < maxPollingTime) {
    try {
      // Check if task is completed via OpenAI API
      const response = await fetch(`https://api.openai.com/v1/responses/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'completed' && data.response) {
          console.log(`✅ Task ${taskId} completed successfully`);
          
          // Extract the final content
          const content = extractFinalContent(data.response);
          
          // Extract sources and metadata
          const finalOutput = data.response.output?.[data.response.output.length - 1];
          const annotations = finalOutput?.content?.[0]?.annotations || [];
          const webSearchCalls = data.response.output?.filter(item => item.type === 'web_search_call') || [];
          const reasoningSteps = data.response.output?.filter(item => item.type === 'reasoning') || [];
          
          // Process sources
          const sources = [];
          
          // Add sources from annotations
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
          
          // Extract conclusion
          let conclusion = "Consulte con un especialista para casos específicos.";
          const conclusionMatch = content.match(/conclusi[óo]n[:\s]*(.*?)(?:\n|$)/i);
          if (conclusionMatch) {
            conclusion = conclusionMatch[1].trim();
          } else if (content.length > 500) {
            const paragraphs = content.split('\n\n').filter(p => p.trim());
            if (paragraphs.length > 1) {
              conclusion = paragraphs[paragraphs.length - 1].trim();
            }
          }
          
          // Save completed research results
          if (lawyerId && lawyerId !== 'anonymous') {
            await saveToolResult(
              supabase,
              lawyerId,
              'research_completed',
              { 
                task_id: taskId,
                original_query: query
              },
              { 
                findings: content,
                sources,
                conclusion
              },
              { 
                timestamp: new Date().toISOString(),
                model: data.model || 'o4-mini-deep-research-2025-06-26',
                citations_count: annotations.length,
                searches_count: webSearchCalls.length,
                reasoning_steps: reasoningSteps.length,
                completion_time: new Date().toISOString(),
                background_mode: true
              }
            );
            
            console.log(`✅ Research results saved for lawyer: ${lawyerId}`);
          }
          
          return; // Task completed successfully
          
        } else if (data.status === 'failed') {
          console.error(`❌ Task ${taskId} failed:`, data.error);
          
          // Save failure record
          if (lawyerId && lawyerId !== 'anonymous') {
            await saveToolResult(
              supabase,
              lawyerId,
              'research_failed',
              { 
                task_id: taskId,
                error: data.error
              },
              { 
                error: data.error,
                failed_at: new Date().toISOString()
              },
              { 
                timestamp: new Date().toISOString(),
                background_mode: true
              }
            );
          }
          
          return; // Task failed
        }
        
        // Task still in progress, continue polling
        console.log(`📡 Task ${taskId} still in progress (${data.status})`);
      }
      
    } catch (error) {
      console.error(`Error polling task ${taskId}:`, error);
    }
    
    // Wait before next poll
    await sleep(pollInterval);
  }
  
  // Polling timeout
  console.warn(`⏰ Polling timeout for task ${taskId} after ${maxPollingTime / 60000} minutes`);
  
  // Save timeout record
  if (lawyerId && lawyerId !== 'anonymous') {
    await saveToolResult(
      supabase,
      lawyerId,
      'research_failed',
      { 
        task_id: taskId,
        error: 'Polling timeout'
      },
      { 
        error: 'Task polling timeout after 35 minutes',
        failed_at: new Date().toISOString()
      },
      { 
        timestamp: new Date().toISOString(),
        background_mode: true
      }
    );
  }
}

// Note: Using OpenAI Deep Research API with Responses endpoint for enhanced web search capabilities
// Background mode enabled for long-running research tasks with web search and citation support