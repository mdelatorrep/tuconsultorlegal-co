import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskId } = await req.json();
    
    if (!taskId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Task ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, anonKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lawyerId = userData.user.id;

    // Get the task
    const { data: task, error: taskError } = await supabase
      .from('async_research_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('lawyer_id', lawyerId)
      .single();

    if (taskError || !task) {
      return new Response(
        JSON.stringify({ success: false, error: 'Task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already completed or failed, return the result
    if (task.status === 'completed' || task.status === 'failed') {
      console.log(`📋 Task ${taskId} already ${task.status}`);
      return new Response(
        JSON.stringify({
          success: task.status === 'completed',
          status: task.status,
          result: task.result,
          error: task.error_message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check OpenAI for the response status
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`📡 Polling OpenAI for response: ${task.openai_response_id}`);

    const response = await fetch(`https://api.openai.com/v1/responses/${task.openai_response_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI poll error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const openaiResponse = await response.json();
    const openaiStatus = openaiResponse.status;
    
    console.log(`📊 OpenAI status for ${task.openai_response_id}: ${openaiStatus}`);

    // If still in progress, return pending status
    if (openaiStatus === 'in_progress' || openaiStatus === 'queued') {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'pending',
          openaiStatus
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If completed, extract result and update task
    if (openaiStatus === 'completed') {
      // Extract text from output
      let resultText = '';
      if (openaiResponse.output && Array.isArray(openaiResponse.output)) {
        for (const item of openaiResponse.output) {
          if (item.type === 'message' && item.content) {
            for (const content of item.content) {
              if (content.type === 'output_text') {
                resultText += content.text;
              }
            }
          }
        }
      }

      // Parse the result
      let parsedResult;
      try {
        parsedResult = JSON.parse(resultText);
      } catch (e) {
        parsedResult = {
          findings: resultText || 'Investigación completada',
          sources: ['Fuentes legales consultadas'],
          conclusion: 'Análisis completado',
          keyPoints: [],
          legalBasis: []
        };
      }

      // Normalize result structure
      const normalizedResult = {
        findings: parsedResult.findings || parsedResult.content || 'Investigación completada',
        sources: parsedResult.sources || parsedResult.fuentes || ['Legislación Colombiana', 'Jurisprudencia'],
        conclusion: parsedResult.conclusion || parsedResult.conclusiones || 'Análisis completado',
        keyPoints: parsedResult.keyPoints || parsedResult.puntosClave || [],
        legalBasis: parsedResult.legalBasis || parsedResult.fundamentosLegales || []
      };

      // Update task as completed
      await supabase
        .from('async_research_tasks')
        .update({
          status: 'completed',
          result: normalizedResult,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

      // Save to legal_tools_results
      await supabase.from('legal_tools_results').insert({
        lawyer_id: lawyerId,
        tool_type: 'research',
        input_data: { query: task.query },
        output_data: normalizedResult,
        metadata: { 
          status: 'completed',
          model: task.model_used,
          responseId: task.openai_response_id,
          asyncTask: true,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`✅ Task ${taskId} completed successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          status: 'completed',
          result: normalizedResult
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle failed/cancelled/incomplete status
    const errorMessage = openaiResponse.error?.message || `Research ended with status: ${openaiStatus}`;
    
    await supabase
      .from('async_research_tasks')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
      .eq('id', taskId);

    console.log(`❌ Task ${taskId} failed: ${errorMessage}`);

    return new Response(
      JSON.stringify({
        success: false,
        status: 'failed',
        error: errorMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in poll-research-task:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
