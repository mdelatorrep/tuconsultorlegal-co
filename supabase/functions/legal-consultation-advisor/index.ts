import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { messages, agentId, threadId, consultationTopic, legalArea } = await req.json();

    console.log('Starting legal consultation with advisor agent:', agentId);

    // Get the legal advisor agent
    const { data: advisorAgent, error: agentError } = await supabase
      .from('legal_advisor_agents')
      .select('*')
      .eq('openai_agent_id', agentId)
      .single();

    if (agentError || !advisorAgent) {
      throw new Error('Legal advisor agent not found');
    }

    // Create or use existing thread
    let currentThreadId = threadId;
    if (!currentThreadId) {
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!threadResponse.ok) {
        throw new Error('Failed to create thread');
      }

      const thread = await threadResponse.json();
      currentThreadId = thread.id;
    }

    // Add user message to thread
    const lastMessage = messages[messages.length - 1];
    await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: lastMessage.content
      })
    });

    // Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: agentId,
        instructions: `Proporciona asesoría legal especializada en ${advisorAgent.specialization} para ${advisorAgent.target_audience}. SIEMPRE consulta fuentes legales actualizadas antes de responder.`
      })
    });

    if (!runResponse.ok) {
      throw new Error('Failed to start assistant run');
    }

    const run = await runResponse.json();
    console.log('Legal consultation run started:', run.id);

    // Poll for completion and handle function calls
    let runStatus = run.status;
    let runData = run;
    const sourcesConsulted: string[] = [];

    while (runStatus === 'in_progress' || runStatus === 'requires_action') {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      // Check run status
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check run status');
      }

      runData = await statusResponse.json();
      runStatus = runData.status;

      // Handle function calls
      if (runStatus === 'requires_action') {
        const toolCalls = runData.required_action?.submit_tool_outputs?.tool_calls || [];
        const toolOutputs = [];

        for (const toolCall of toolCalls) {
          console.log('Processing legal function call:', toolCall.function.name);
          
          let output = '';
          try {
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            switch (toolCall.function.name) {
              case 'search_legal_sources':
                output = await handleLegalSearch(functionArgs, advisorAgent, sourcesConsulted, supabase);
                break;
                
              case 'validate_legal_citation':
                output = await handleCitationValidation(functionArgs);
                break;
                
              case 'provide_legal_advice':
                output = await handleLegalAdvice(functionArgs, advisorAgent);
                break;
                
              default:
                output = `Función ${toolCall.function.name} no implementada para asesoría legal`;
            }
          } catch (error) {
            console.error(`Error processing function ${toolCall.function.name}:`, error);
            output = `Error: ${error.message}`;
          }

          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: output
          });
        }

        // Submit tool outputs
        await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}/submit_tool_outputs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({
            tool_outputs: toolOutputs
          })
        });
      }
    }

    // Get the latest messages
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesResponse.ok) {
      throw new Error('Failed to get messages');
    }

    const messagesData = await messagesResponse.json();
    const latestMessage = messagesData.data[0];

    // Save consultation to database
    const { data: consultation, error: consultationError } = await supabase
      .from('legal_consultations')
      .upsert({
        advisor_agent_id: advisorAgent.id,
        thread_id: currentThreadId,
        consultation_topic: consultationTopic,
        legal_area: legalArea || advisorAgent.specialization,
        consultation_data: {
          last_message: latestMessage,
          run_status: runStatus,
          run_id: run.id,
          messages_count: messages.length + 1
        },
        sources_consulted: sourcesConsulted,
        status: runStatus === 'completed' ? 'completed' : 'active'
      })
      .select()
      .single();

    if (consultationError) {
      console.error('Error saving consultation:', consultationError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: latestMessage.content[0]?.text?.value || 'No response',
      threadId: currentThreadId,
      runStatus: runStatus,
      consultationId: consultation?.id,
      sourcesConsulted: sourcesConsulted,
      specialization: advisorAgent.specialization,
      consultationComplete: runStatus === 'completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in legal consultation:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getKnowledgeBaseUrls(supabase: any): Promise<any[]> {
  try {
    const { data: urls, error } = await supabase
      .from('knowledge_base_urls')
      .select('url, description, category, priority')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('category');

    if (error || !urls) {
      console.error('Error loading knowledge base URLs:', error);
      return [];
    }

    return urls;
  } catch (error) {
    console.error('Error loading knowledge base URLs:', error);
    return [];
  }
}

// Function handlers for legal consultation
async function handleLegalSearch(args: any, advisorAgent: any, sourcesConsulted: string[], supabase: any) {
  console.log('Performing legal search:', args);
  
  try {
    const { query, legal_area, source_type } = args;
    
    // Call the search-legal-sources edge function
    const { data, error } = await supabase.functions.invoke('search-legal-sources', {
      body: { 
        query, 
        legal_area: legal_area || advisorAgent.specialization, 
        source_type,
        include_kb_urls: true 
      }
    });
    
    if (error) {
      console.error('Error calling search-legal-sources:', error);
      return `Error al buscar fuentes legales: ${error.message}`;
    }
    
    if (!data || !data.success) {
      return 'No se pudieron obtener resultados de la búsqueda legal.';
    }
    
    const results = data.results;
    let response = `📚 RESULTADOS DE BÚSQUEDA LEGAL: "${query}"${legal_area ? ` (${legal_area})` : ''}\n\n`;
    
    // Track sources consulted
    if (results.knowledge_base_urls) {
      results.knowledge_base_urls.forEach((url: any) => {
        if (!sourcesConsulted.includes(url.url)) {
          sourcesConsulted.push(url.url);
        }
      });
    }
    
    if (results.web_results) {
      results.web_results.forEach((result: any) => {
        if (!sourcesConsulted.includes(result.link)) {
          sourcesConsulted.push(result.link);
        }
      });
    }
    
    // Add knowledge base URLs (official sources)
    if (results.knowledge_base_urls && results.knowledge_base_urls.length > 0) {
      response += '🏛️ FUENTES OFICIALES AUTORIZADAS:\n';
      
      const urlsByCategory = results.knowledge_base_urls.reduce((acc: any, url: any) => {
        if (!acc[url.category]) acc[url.category] = [];
        acc[url.category].push(url);
        return acc;
      }, {});
      
      const categoryNames: Record<string, string> = {
        'legislacion': 'LEGISLACIÓN Y NORMATIVIDAD',
        'jurisprudencia': 'JURISPRUDENCIA Y DECISIONES JUDICIALES',
        'normatividad': 'NORMATIVIDAD LOCAL Y DISTRITAL',
        'doctrina': 'DOCTRINA JURÍDICA',
        'general': 'FUENTES GENERALES'
      };
      
      Object.entries(urlsByCategory).forEach(([category, urls]: [string, any]) => {
        response += `\n**${categoryNames[category] || category.toUpperCase()}:**\n`;
        urls.slice(0, 3).forEach((url: any) => {
          response += `• ${url.url}${url.description ? ` - ${url.description}` : ''}\n`;
        });
      });
      
      response += '\n';
    }
    
    // Add web search results
    if (results.web_results && results.web_results.length > 0) {
      response += '🔍 RESULTADOS DE BÚSQUEDA EN LÍNEA (Priorizados por relevancia oficial):\n\n';
      
      results.web_results.slice(0, 5).forEach((result: any, idx: number) => {
        const isOfficial = result.link.includes('gov.co');
        response += `${idx + 1}. ${isOfficial ? '🏛️ ' : ''}**${result.title}**\n`;
        response += `   ${result.snippet}\n`;
        response += `   🔗 ${result.link}\n\n`;
      });
    }
    
    // Add answer box if available
    if (results.answer_box) {
      response += '💡 RESPUESTA DIRECTA:\n';
      response += `${results.answer_box.answer}\n`;
      response += `Fuente: ${results.answer_box.source}\n\n`;
    }
    
    // Add knowledge graph if available
    if (results.knowledge_graph) {
      response += '📖 INFORMACIÓN CONTEXTUAL:\n';
      response += `${results.knowledge_graph.title}\n`;
      response += `${results.knowledge_graph.description}\n\n`;
    }
    
    response += '\n⚠️ IMPORTANTE:\n';
    response += '- Prioriza siempre las fuentes oficiales (.gov.co)\n';
    response += '- Verifica la vigencia de las normas antes de citarlas\n';
    response += '- Usa esta información para fundamentar tu asesoría\n';
    response += '- Siempre menciona las fuentes oficiales consultadas\n';
    
    return response;
    
  } catch (error) {
    console.error('Error in handleLegalSearch:', error);
    return `Error al buscar fuentes legales: ${error.message}`;
  }
}

async function handleCitationValidation(args: any) {
  console.log('Validating legal citation:', args);
  
  const { law_number, year, article } = args;
  
  // Simulate citation validation
  const citationInfo = `
📋 VALIDACIÓN DE CITA LEGAL:

Norma: ${law_number}${year ? ` de ${year}` : ''}
${article ? `Artículo: ${article}` : ''}

✅ FORMATO CORRECTO: Ley ${law_number}${year ? ` de ${year}` : ''}${article ? `, artículo ${article}` : ''}

⚠️ VERIFICACIÓN REQUERIDA:
- Confirmar vigencia en el Diario Oficial
- Verificar modificaciones posteriores
- Comprobar derogatorias
- Consultar jurisprudencia aplicable

🔗 FUENTES DE VERIFICACIÓN:
- www.funcionpublica.gov.co
- www.diariooficial.gov.co
- www.corteconstitucional.gov.co
`;

  return citationInfo;
}

async function handleLegalAdvice(args: any, advisorAgent: any) {
  console.log('Providing structured legal advice:', args);
  
  const { situation, applicable_laws, recommendations, next_steps } = args;
  
  const advice = `
📝 ASESORÍA LEGAL ESPECIALIZADA - ${advisorAgent.specialization.toUpperCase()}

🔍 SITUACIÓN ANALIZADA:
${situation}

⚖️ MARCO NORMATIVO APLICABLE:
${applicable_laws.map((law: string) => `• ${law}`).join('\n')}

💡 RECOMENDACIONES LEGALES:
${recommendations.map((rec: string) => `• ${rec}`).join('\n')}

${next_steps && next_steps.length > 0 ? `
📋 PRÓXIMOS PASOS:
${next_steps.map((step: string) => `• ${step}`).join('\n')}
` : ''}

⚠️ ADVERTENCIAS IMPORTANTES:
• Esta asesoría se basa en la normativa vigente consultada
• Se recomienda verificación adicional con un abogado especializado
• Pueden existir normativas específicas no contempladas
• La aplicación puede variar según las circunstancias particulares

🎯 ESPECIALIZACIÓN: ${advisorAgent.specialization} para ${advisorAgent.target_audience}
`;

  return advice;
}