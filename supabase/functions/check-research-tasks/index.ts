import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CHECK-RESEARCH-TASKS] Starting check for pending research tasks...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find all initiated research tasks older than 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const timeoutThreshold = new Date(Date.now() - 40 * 60 * 1000).toISOString();

    const { data: pendingTasks, error: fetchError } = await supabase
      .from('legal_tools_results')
      .select('*')
      .eq('tool_type', 'research')
      .filter('metadata->>status', 'eq', 'initiated')
      .lt('created_at', twoMinutesAgo);

    if (fetchError) {
      console.error('[CHECK-RESEARCH-TASKS] Error fetching pending tasks:', fetchError);
      throw fetchError;
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      console.log('[CHECK-RESEARCH-TASKS] No pending research tasks found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending tasks',
          checkedAt: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CHECK-RESEARCH-TASKS] Found ${pendingTasks.length} pending task(s)`);

    const results = [];

    for (const task of pendingTasks) {
      const taskId = task.metadata?.task_id;
      const createdAt = new Date(task.created_at);

      console.log(`[CHECK-RESEARCH-TASKS] Processing task ${task.id}, OpenAI task_id: ${taskId}`);

      // Check for timeout (>40 minutes old)
      if (task.created_at < timeoutThreshold) {
        console.log(`[CHECK-RESEARCH-TASKS] Task ${task.id} has timed out (>40 minutes)`);
        
        await supabase
          .from('legal_tools_results')
          .update({
            metadata: {
              ...task.metadata,
              status: 'failed',
              error: 'Task timed out after 40 minutes',
              checked_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id);

        results.push({
          task_id: task.id,
          openai_task_id: taskId,
          status: 'timeout',
          message: 'Task marked as failed due to timeout'
        });
        continue;
      }

      if (!taskId) {
        console.log(`[CHECK-RESEARCH-TASKS] Task ${task.id} has no OpenAI task_id, skipping`);
        results.push({
          task_id: task.id,
          status: 'skipped',
          message: 'No OpenAI task_id found'
        });
        continue;
      }

      try {
        // Check status with OpenAI
        console.log(`[CHECK-RESEARCH-TASKS] Checking OpenAI status for task ${taskId}`);
        
        const statusResponse = await fetch(`https://api.openai.com/v1/responses/${taskId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!statusResponse.ok) {
          const errorText = await statusResponse.text();
          console.error(`[CHECK-RESEARCH-TASKS] OpenAI API error for task ${taskId}:`, errorText);
          
          results.push({
            task_id: task.id,
            openai_task_id: taskId,
            status: 'error',
            message: `OpenAI API error: ${statusResponse.status}`
          });
          continue;
        }

        const statusData = await statusResponse.json();
        console.log(`[CHECK-RESEARCH-TASKS] OpenAI status for ${taskId}:`, statusData.status);

        if (statusData.status === 'completed') {
          // Extract results using the same logic as the webhook handler
          console.log(`[CHECK-RESEARCH-TASKS] Extracting completed research for task ${taskId}`);
          
          // Extract the final content text
          const findings = extractFinalContent(statusData);
          
          // Extract sources from annotations and web search calls
          const finalOutput = statusData.output?.[statusData.output.length - 1];
          const annotations = finalOutput?.content?.[0]?.annotations || [];
          const webSearchCalls = statusData.output?.filter((item: any) => item.type === 'web_search_call') || [];
          const reasoningSteps = statusData.output?.filter((item: any) => item.type === 'reasoning') || [];
          
          // Process sources
          const sources = [];
          
          // Add sources from annotations
          annotations.forEach((annotation: any, index: number) => {
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
          webSearchCalls.forEach((searchCall: any, index: number) => {
            if (searchCall.action?.query) {
              sources.push({
                title: `Búsqueda: "${searchCall.action.query}"`,
                type: 'search',
                status: searchCall.status || 'completed',
                index: sources.length + 1
              });
            }
          });
          
          // Extract conclusion (look for patterns or use last paragraph)
          let conclusion = "Consulte con un especialista para casos específicos.";
          const conclusionMatch = findings.match(/conclusi[óo]n[:\s]*(.*?)(?:\n|$)/i);
          if (conclusionMatch) {
            conclusion = conclusionMatch[1].trim();
          } else if (findings.length > 500) {
            const paragraphs = findings.split('\n\n').filter((p: string) => p.trim());
            if (paragraphs.length > 1) {
              conclusion = paragraphs[paragraphs.length - 1].trim();
            }
          }

          const outputData = {
            findings,
            sources,
            conclusion,
            research_query: task.input_data?.query || '',
            completed_at: new Date().toISOString()
          };

          // Update task as completed
          await supabase
            .from('legal_tools_results')
            .update({
              output_data: outputData,
              metadata: {
                ...task.metadata,
                status: 'completed',
                completed_at: new Date().toISOString(),
                checked_by_cron: true,
                citations_count: annotations.length,
                searches_count: webSearchCalls.length,
                reasoning_steps: reasoningSteps.length
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id);

          console.log(`[CHECK-RESEARCH-TASKS] ✅ Task ${task.id} completed successfully`);
          
          results.push({
            task_id: task.id,
            openai_task_id: taskId,
            status: 'completed',
            findings_length: findings.length,
            sources_count: sources.length,
            citations_count: annotations.length
          });

        } else if (statusData.status === 'failed') {
          // Mark as failed
          await supabase
            .from('legal_tools_results')
            .update({
              metadata: {
                ...task.metadata,
                status: 'failed',
                error: statusData.error || 'Research failed',
                checked_at: new Date().toISOString(),
                checked_by_cron: true
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id);

          console.log(`[CHECK-RESEARCH-TASKS] ❌ Task ${task.id} failed`);
          
          results.push({
            task_id: task.id,
            openai_task_id: taskId,
            status: 'failed',
            error: statusData.error
          });

        } else {
          // Still in progress
          console.log(`[CHECK-RESEARCH-TASKS] Task ${task.id} still in progress`);
          
          await supabase
            .from('legal_tools_results')
            .update({
              metadata: {
                ...task.metadata,
                last_checked: new Date().toISOString(),
                checked_by_cron: true
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id);

          results.push({
            task_id: task.id,
            openai_task_id: taskId,
            status: 'in_progress',
            message: 'Task still processing'
          });
        }

      } catch (error) {
        console.error(`[CHECK-RESEARCH-TASKS] Error checking task ${task.id}:`, error);
        results.push({
          task_id: task.id,
          openai_task_id: taskId,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`[CHECK-RESEARCH-TASKS] ✅ Check completed. Processed ${results.length} task(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
        checkedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CHECK-RESEARCH-TASKS] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
