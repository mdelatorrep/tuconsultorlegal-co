import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get system configuration
async function getSystemConfig(supabase: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    const { data, error } = await supabase
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

// Sleep utility with jitter
function sleep(ms: number): Promise<void> {
  const jitter = Math.random() * 1000;
  return new Promise(resolve => setTimeout(resolve, ms + jitter));
}

// Extract content from OpenAI response
function extractFinalContent(responseData: any): string {
  if (!responseData || !responseData.output || !Array.isArray(responseData.output)) {
    return 'No se pudo obtener respuesta del asistente de investigación';
  }
  
  for (let i = responseData.output.length - 1; i >= 0; i--) {
    const item = responseData.output[i];
    if (!item.content) continue;
    
    for (const content of item.content) {
      if (content.type === 'message' && content.text) return content.text;
      if ((content.type === 'text' || content.type === 'input_text') && (content.text || content.value)) {
        return content.text || content.value;
      }
    }
  }
  
  return 'No se pudo obtener respuesta del asistente de investigación';
}

// Process a single research request with retries
async function processResearch(
  supabase: any,
  queueItem: any,
  openaiApiKey: string,
  researchModel: string,
  systemPrompt: string
): Promise<{ success: boolean; error?: string; taskId?: string }> {
  
  const maxRetries = 3;
  let lastError = '';
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Processing research ${queueItem.queue_id}, attempt ${attempt + 1}/${maxRetries}`);
      
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: researchModel,
          max_output_tokens: 50000,
          reasoning: {
            effort: "medium",
            summary: "detailed"
          },
          background: true,
          input: [
            {
              role: 'developer',
              content: [{ type: 'input_text', text: systemPrompt }]
            },
            {
              role: 'user',
              content: [{ type: 'input_text', text: `Consulta jurídica para investigación: ${queueItem.query}` }]
            }
          ],
          tools: [{ type: 'web_search_preview' }]
        }),
      });

      if (response.status === 429) {
        const errorText = await response.text();
        console.log(`Rate limit hit on attempt ${attempt + 1}:`, errorText);
        
        // Get retry-after header or calculate backoff
        const retryAfter = response.headers.get('retry-after');
        let waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(60000, (2 ** attempt) * 10000);
        
        // Check if we should give up for now
        if (attempt === maxRetries - 1) {
          return { success: false, error: `Rate limit exceeded after ${maxRetries} attempts` };
        }
        
        console.log(`Waiting ${waitMs}ms before retry...`);
        await sleep(waitMs);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        lastError = `OpenAI API error: ${response.status} ${errorText}`;
        console.error(lastError);
        
        if (attempt < maxRetries - 1) {
          await sleep(5000);
          continue;
        }
        return { success: false, error: lastError };
      }

      const data = await response.json();
      console.log('OpenAI response received:', JSON.stringify(data, null, 2).substring(0, 500));
      
      if (data.id) {
        return { success: true, taskId: data.id };
      } else {
        return { success: false, error: 'No task ID in response' };
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Attempt ${attempt + 1} failed:`, lastError);
      
      if (attempt < maxRetries - 1) {
        await sleep(5000);
      }
    }
  }
  
  return { success: false, error: lastError };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const maxExecutionTime = 50000; // 50 seconds max
  
  try {
    console.log('🚀 Research queue processor started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get configuration
    const researchModel = await getSystemConfig(supabase, 'research_ai_model', 'o4-mini-deep-research-2025-06-26');
    const systemPrompt = await getSystemConfig(
      supabase, 
      'research_system_prompt', 
      'Eres un especialista en investigación jurídica colombiana. Analiza la consulta y proporciona respuestas detalladas basadas en legislación, jurisprudencia y normativa vigente con fuentes actualizadas.'
    );
    const minSpacing = parseInt(await getSystemConfig(supabase, 'research_queue_min_spacing_seconds', '180'));
    
    let processedCount = 0;
    let rateLimitedCount = 0;
    
    // Process queue items
    while (Date.now() - startTime < maxExecutionTime) {
      // Get next item from queue
      const { data: nextItems, error: nextError } = await supabase
        .rpc('get_next_research_from_queue');
      
      if (nextError) {
        console.error('Error getting next queue item:', nextError);
        break;
      }
      
      if (!nextItems || nextItems.length === 0) {
        console.log('📭 No items ready to process');
        break;
      }
      
      const queueItem = nextItems[0];
      console.log(`📋 Processing queue item: ${queueItem.queue_id} (retry: ${queueItem.retry_count})`);
      
      // Mark as processing
      await supabase
        .from('research_queue')
        .update({ 
          status: 'processing', 
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', queueItem.queue_id);
      
      // Process the research
      const result = await processResearch(
        supabase,
        queueItem,
        openaiApiKey,
        researchModel,
        systemPrompt
      );
      
      if (result.success && result.taskId) {
        // Save initial record to legal_tools_results
        const { data: resultRecord, error: insertError } = await supabase
          .from('legal_tools_results')
          .insert({
            lawyer_id: queueItem.lawyer_id,
            tool_type: 'research',
            input_data: { 
              query: queueItem.query,
              task_id: result.taskId 
            },
            output_data: { processing: true },
            metadata: { 
              status: 'initiated',
              task_id: result.taskId,
              queue_id: queueItem.queue_id,
              timestamp: new Date().toISOString()
            }
          })
          .select('id')
          .single();
        
        if (insertError) {
          console.error('Error saving result record:', insertError);
        }
        
        // Update queue item
        await supabase
          .from('research_queue')
          .update({ 
            status: 'processing',
            openai_task_id: result.taskId,
            result_id: resultRecord?.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', queueItem.queue_id);
        
        processedCount++;
        console.log(`✅ Research task started: ${result.taskId}`);
        
        // Wait minimum spacing before processing next
        if (Date.now() - startTime + minSpacing * 1000 < maxExecutionTime) {
          console.log(`⏳ Waiting ${minSpacing}s before next item...`);
          await sleep(minSpacing * 1000);
        }
        
      } else {
        // Handle failure
        const isRateLimit = result.error?.includes('Rate limit') || result.error?.includes('429');
        const newRetryCount = queueItem.retry_count + 1;
        const maxRetries = 5;
        
        if (isRateLimit && newRetryCount < maxRetries) {
          // Calculate exponential backoff for next retry
          const backoffSeconds = Math.min(600, minSpacing * (2 ** newRetryCount)); // Max 10 minutes
          const nextRetryAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();
          
          await supabase
            .from('research_queue')
            .update({ 
              status: 'rate_limited',
              retry_count: newRetryCount,
              next_retry_at: nextRetryAt,
              last_error: result.error,
              updated_at: new Date().toISOString()
            })
            .eq('id', queueItem.queue_id);
          
          rateLimitedCount++;
          console.log(`⏰ Rate limited, will retry at ${nextRetryAt}`);
          
        } else if (newRetryCount >= maxRetries) {
          // Mark as failed
          await supabase
            .from('research_queue')
            .update({ 
              status: 'failed',
              retry_count: newRetryCount,
              last_error: result.error || 'Max retries exceeded',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', queueItem.queue_id);
          
          // Save failure to legal_tools_results
          await supabase
            .from('legal_tools_results')
            .insert({
              lawyer_id: queueItem.lawyer_id,
              tool_type: 'research',
              input_data: { query: queueItem.query },
              output_data: { error: result.error },
              metadata: { 
                status: 'failed',
                queue_id: queueItem.queue_id,
                error: result.error,
                timestamp: new Date().toISOString()
              }
            });
          
          console.log(`❌ Research failed permanently: ${result.error}`);
          
        } else {
          // General retry
          const nextRetryAt = new Date(Date.now() + 60000).toISOString(); // 1 minute
          await supabase
            .from('research_queue')
            .update({ 
              status: 'pending',
              retry_count: newRetryCount,
              next_retry_at: nextRetryAt,
              last_error: result.error,
              updated_at: new Date().toISOString()
            })
            .eq('id', queueItem.queue_id);
          
          console.log(`🔄 Will retry at ${nextRetryAt}`);
        }
        
        // Don't process more if rate limited
        if (isRateLimit) {
          console.log('🛑 Stopping due to rate limit');
          break;
        }
      }
    }
    
    console.log(`📊 Queue processing complete: ${processedCount} processed, ${rateLimitedCount} rate limited`);
    
    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        rate_limited: rateLimitedCount,
        execution_time_ms: Date.now() - startTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in process-research-queue:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
