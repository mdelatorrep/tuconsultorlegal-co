import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract final content from OpenAI response
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Checking research tasks status...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Check both the new queue table and legacy legal_tools_results
    
    // 1. Get processing tasks from research_queue
    const { data: queueTasks, error: queueError } = await supabase
      .from('research_queue')
      .select('*')
      .eq('status', 'processing')
      .not('openai_task_id', 'is', null)
      .order('started_at', { ascending: true });

    // 2. Get legacy initiated tasks from legal_tools_results
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: legacyTasks, error: legacyError } = await supabase
      .from('legal_tools_results')
      .select('*')
      .eq('tool_type', 'research')
      .filter('metadata->>status', 'eq', 'initiated')
      .lt('created_at', twoMinutesAgo);

    const allTasks = [
      ...(queueTasks || []).map(t => ({ ...t, source: 'queue' })),
      ...(legacyTasks || []).filter(t => t.metadata?.task_id).map(t => ({ ...t, source: 'legacy' }))
    ];

    console.log(`Found ${allTasks.length} tasks to check (${queueTasks?.length || 0} queue, ${legacyTasks?.length || 0} legacy)`);

    let completedCount = 0;
    let failedCount = 0;
    let stillProcessingCount = 0;
    let timedOutCount = 0;

    for (const task of allTasks) {
      const isQueueTask = task.source === 'queue';
      const taskId = isQueueTask ? task.openai_task_id : task.metadata?.task_id;
      const startedAt = isQueueTask ? task.started_at : task.created_at;
      
      try {
        const taskAge = Date.now() - new Date(startedAt).getTime();
        const maxAge = 40 * 60 * 1000; // 40 minutes timeout
        
        // Check for timeout
        if (taskAge > maxAge) {
          console.log(`⏰ Task ${taskId} timed out after 40 minutes`);
          
          if (isQueueTask) {
            await supabase
              .from('research_queue')
              .update({ 
                status: 'failed',
                last_error: 'Task timed out after 40 minutes',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', task.id);
            
            if (task.result_id) {
              await supabase
                .from('legal_tools_results')
                .update({
                  output_data: { error: 'Task timed out' },
                  metadata: { 
                    status: 'failed',
                    error: 'Task timed out after 40 minutes',
                    timestamp: new Date().toISOString()
                  }
                })
                .eq('id', task.result_id);
            }
          } else {
            await supabase
              .from('legal_tools_results')
              .update({
                metadata: { ...task.metadata, status: 'failed', error: 'Task timed out after 40 minutes' },
                updated_at: new Date().toISOString()
              })
              .eq('id', task.id);
          }
          
          timedOutCount++;
          continue;
        }

        if (!taskId) {
          console.log(`Task has no OpenAI task_id, skipping`);
          continue;
        }

        // Check task status with OpenAI
        console.log(`Checking OpenAI task: ${taskId}`);
        
        const response = await fetch(`https://api.openai.com/v1/responses/${taskId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error checking task ${taskId}:`, errorText);
          continue;
        }

        const data = await response.json();
        console.log(`Task ${taskId} status: ${data.status}`);

        if (data.status === 'completed') {
          // Extract results
          const content = extractFinalContent(data);
          const finalOutput = data.output?.[data.output.length - 1];
          const annotations = finalOutput?.content?.[0]?.annotations || [];
          const webSearchCalls = data.output?.filter((item: any) => item.type === 'web_search_call') || [];
          
          // Process sources
          const sources: any[] = [];
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
          
          webSearchCalls.forEach((searchCall: any) => {
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
          }

          const outputData = {
            findings: content,
            sources,
            conclusion
          };

          const metadata = { 
            status: 'completed',
            task_id: taskId,
            citations_count: annotations.length,
            searches_count: webSearchCalls.length,
            completion_time: new Date().toISOString()
          };

          if (isQueueTask) {
            await supabase
              .from('research_queue')
              .update({ 
                status: 'completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', task.id);

            if (task.result_id) {
              await supabase
                .from('legal_tools_results')
                .update({ output_data: outputData, metadata })
                .eq('id', task.result_id);
            } else {
              await supabase
                .from('legal_tools_results')
                .insert({
                  lawyer_id: task.lawyer_id,
                  tool_type: 'research',
                  input_data: { query: task.query, task_id: taskId },
                  output_data: outputData,
                  metadata: { ...metadata, queue_id: task.id }
                });
            }
          } else {
            await supabase
              .from('legal_tools_results')
              .update({
                output_data: outputData,
                metadata: { ...task.metadata, ...metadata },
                updated_at: new Date().toISOString()
              })
              .eq('id', task.id);
          }

          completedCount++;
          console.log(`✅ Task ${taskId} completed successfully`);

        } else if (data.status === 'failed') {
          const errorMessage = data.error?.message || data.incomplete_details?.reason || 'Unknown error';
          
          if (isQueueTask) {
            await supabase
              .from('research_queue')
              .update({ 
                status: 'failed',
                last_error: errorMessage,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', task.id);

            if (task.result_id) {
              await supabase
                .from('legal_tools_results')
                .update({
                  output_data: { error: errorMessage },
                  metadata: { status: 'failed', error: errorMessage, error_details: data.error }
                })
                .eq('id', task.result_id);
            }
          } else {
            await supabase
              .from('legal_tools_results')
              .update({
                metadata: { ...task.metadata, status: 'failed', error: errorMessage, error_details: data.error },
                updated_at: new Date().toISOString()
              })
              .eq('id', task.id);
          }

          failedCount++;
          console.log(`❌ Task ${taskId} failed: ${errorMessage}`);

        } else {
          // Still in progress
          if (isQueueTask) {
            await supabase
              .from('research_queue')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', task.id);
          } else {
            await supabase
              .from('legal_tools_results')
              .update({
                metadata: { ...task.metadata, last_checked: new Date().toISOString() },
                updated_at: new Date().toISOString()
              })
              .eq('id', task.id);
          }
          
          stillProcessingCount++;
          console.log(`⏳ Task ${taskId} still in progress`);
        }

      } catch (taskError) {
        console.error(`Error processing task:`, taskError);
      }
    }

    // Trigger queue processor
    try {
      await fetch(`${supabaseUrl}/functions/v1/process-research-queue`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ trigger: 'cron_check' })
      });
    } catch (e) {
      console.log('Queue processor trigger skipped');
    }

    console.log(`📊 Check complete: ${completedCount} completed, ${failedCount} failed, ${stillProcessingCount} processing, ${timedOutCount} timed out`);

    return new Response(
      JSON.stringify({
        success: true,
        completed: completedCount,
        failed: failedCount,
        still_processing: stillProcessingCount,
        timed_out: timedOutCount,
        total_checked: allTasks.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-research-tasks:', error);
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
