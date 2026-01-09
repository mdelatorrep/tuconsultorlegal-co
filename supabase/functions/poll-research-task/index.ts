import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract web search citations from OpenAI response
interface WebSearchCitation {
  url: string;
  title?: string;
  start_index: number;
  end_index: number;
}

function extractWebSearchCitations(output: any[]): WebSearchCitation[] {
  const citations: WebSearchCitation[] = [];
  
  for (const item of output) {
    if (item.type === 'message' && item.content && Array.isArray(item.content)) {
      for (const content of item.content) {
        if (content.type === 'output_text' && content.annotations && Array.isArray(content.annotations)) {
          for (const annotation of content.annotations) {
            if (annotation.type === 'url_citation') {
              citations.push({
                url: annotation.url,
                title: annotation.title,
                start_index: annotation.start_index,
                end_index: annotation.end_index
              });
            }
          }
        }
      }
    }
  }
  
  return citations;
}

// Format text with proper links from citations
function formatTextWithLinks(text: string, citations: WebSearchCitation[]): string {
  if (!citations || citations.length === 0) return text;
  
  // Sort citations by start_index in reverse order to avoid offset issues when replacing
  const sortedCitations = [...citations].sort((a, b) => b.start_index - a.start_index);
  
  let formattedText = text;
  
  for (const citation of sortedCitations) {
    // Extract the cited text
    const citedText = text.substring(citation.start_index, citation.end_index);
    
    // Create a markdown link
    const linkText = citation.title || citedText;
    const markdownLink = `[${linkText}](${citation.url})`;
    
    // Replace in the formatted text
    formattedText = formattedText.substring(0, citation.start_index) + 
                   markdownLink + 
                   formattedText.substring(citation.end_index);
  }
  
  return formattedText;
}

// Get unique sources from citations
function getSourcesFromCitations(citations: WebSearchCitation[]): string[] {
  const uniqueUrls = new Map<string, string>();
  
  for (const citation of citations) {
    if (!uniqueUrls.has(citation.url)) {
      uniqueUrls.set(citation.url, citation.title || citation.url);
    }
  }
  
  return Array.from(uniqueUrls.entries()).map(([url, title]) => {
    // Format as markdown link
    return `[${title}](${url})`;
  });
}

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

    // If completed or incomplete (partial results may be available), extract result
    if (openaiStatus === 'completed' || openaiStatus === 'incomplete') {
      // Extract text from output and citations
      let resultText = '';
      let webCitations: WebSearchCitation[] = [];
      
      if (openaiResponse.output && Array.isArray(openaiResponse.output)) {
        // Extract citations first
        webCitations = extractWebSearchCitations(openaiResponse.output);
        console.log(`📎 Found ${webCitations.length} web citations`);
        
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

      // Check if we have any content for incomplete status
      if (openaiStatus === 'incomplete' && !resultText.trim()) {
        // No partial results available - truly failed
        const incompleteReason = openaiResponse.incomplete_details?.reason || 'unknown';
        let errorMessage = 'La investigación no pudo completarse.';
        
        if (incompleteReason === 'max_output_tokens') {
          errorMessage = 'La consulta generó una respuesta demasiado extensa. Por favor, divida su consulta en preguntas más específicas.';
        } else if (incompleteReason === 'content_filter') {
          errorMessage = 'El contenido fue filtrado por políticas de seguridad.';
        } else {
          errorMessage = `La investigación se interrumpió (razón: ${incompleteReason}). Intente simplificar la consulta.`;
        }
        
        await supabase
          .from('async_research_tasks')
          .update({
            status: 'failed',
            error_message: errorMessage,
            completed_at: new Date().toISOString()
          })
          .eq('id', taskId);

        console.log(`❌ Task ${taskId} incomplete with no results: ${incompleteReason}`);

        return new Response(
          JSON.stringify({
            success: false,
            status: 'failed',
            error: errorMessage
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parse the result (complete or partial)
      let parsedResult;
      try {
        parsedResult = JSON.parse(resultText);
      } catch (e) {
        // Not valid JSON - format as structured result with links
        const formattedText = formatTextWithLinks(resultText, webCitations);
        const sourcesFromCitations = getSourcesFromCitations(webCitations);
        
        parsedResult = {
          findings: formattedText || 'Investigación completada',
          sources: sourcesFromCitations.length > 0 ? sourcesFromCitations : ['Fuentes legales consultadas'],
          conclusion: openaiStatus === 'incomplete' ? 'Análisis parcial - la consulta era muy compleja' : 'Análisis completado',
          keyPoints: [],
          legalBasis: []
        };
      }

      // Get sources from citations if available and not already in result
      const citationSources = getSourcesFromCitations(webCitations);
      
      // Normalize result structure - handle all possible field names
      const normalizedResult = {
        findings: parsedResult.findings || parsedResult.content || 'Investigación completada',
        analysis: parsedResult.analysis || null,
        sources: citationSources.length > 0 
          ? citationSources 
          : (parsedResult.sources || parsedResult.fuentes || ['Legislación Colombiana', 'Jurisprudencia']),
        conclusion: parsedResult.finalConclusion || parsedResult.conclusion || parsedResult.conclusiones || 'Análisis completado',
        keyPoints: parsedResult.keyPoints || parsedResult.puntosClave || [],
        legalBasis: parsedResult.legalBasis || parsedResult.fundamentosLegales || [],
        recommendations: parsedResult.recommendations_practical || parsedResult.recommendations || null,
        risks: parsedResult.risks_uncertainties || parsedResult.risks || null,
        lastUpdated: parsedResult.lastUpdated || null,
        verificationNotes: parsedResult.notes_on_verification || null,
        isPartial: openaiStatus === 'incomplete',
        webCitations: webCitations.length > 0 ? webCitations : undefined
      };

      // Add notice if partial
      if (openaiStatus === 'incomplete') {
        normalizedResult.conclusion = `⚠️ RESULTADO PARCIAL: ${normalizedResult.conclusion}. La consulta era muy extensa. Considere dividirla en preguntas más específicas para obtener respuestas completas.`;
      }

      // Update task as completed (even if partial, we have useful content)
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
          status: openaiStatus,
          model: task.model_used,
          responseId: task.openai_response_id,
          asyncTask: true,
          isPartial: openaiStatus === 'incomplete',
          timestamp: new Date().toISOString()
        }
      });

      console.log(`✅ Task ${taskId} ${openaiStatus === 'incomplete' ? 'completed with partial results' : 'completed successfully'}`);

      return new Response(
        JSON.stringify({
          success: true,
          status: 'completed',
          result: normalizedResult,
          isPartial: openaiStatus === 'incomplete'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle failed/cancelled status
    const errorMessage = openaiResponse.error?.message || `La investigación finalizó con estado: ${openaiStatus}`;
    
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
