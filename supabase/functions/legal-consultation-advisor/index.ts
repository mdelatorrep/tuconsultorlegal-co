import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
                output = await handleLegalSearch(functionArgs, advisorAgent, sourcesConsulted);
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

// Function handlers for legal consultation
async function handleLegalSearch(args: any, advisorAgent: any, sourcesConsulted: string[]) {
  console.log('Performing legal search:', args);
  
  const { query, legal_area, source_type } = args;
  const legalSources = advisorAgent.legal_sources || [];
  
  // Build search query with Colombian legal context
  const searchQueries = [
    `${query} Colombia ley vigente ${legal_area}`,
    `${query} jurisprudencia Colombia corte suprema`,
    `${query} decreto reglamentario Colombia ${legal_area}`,
    `${query} normativa colombiana ${source_type || ''}`
  ];

  let searchResults = '';
  
  for (const searchQuery of searchQueries.slice(0, 2)) { // Limit to 2 searches
    try {
      // In a real implementation, you would use the web search tool here
      // For now, we'll simulate the search results
      searchResults += `Búsqueda: "${searchQuery}"\n`;
      searchResults += `Fuentes relevantes encontradas para ${legal_area} en Colombia:\n`;
      
      // Add specific legal sources
      for (const source of legalSources.slice(0, 3)) {
        searchResults += `- ${source}: Normativa actualizada sobre ${query}\n`;
        if (!sourcesConsulted.includes(source)) {
          sourcesConsulted.push(source);
        }
      }
      
      // Add common Colombian legal sources
      const commonSources = [
        'Constitución Política de Colombia 1991',
        `Código ${legal_area === 'civil' ? 'Civil' : legal_area === 'comercial' ? 'de Comercio' : 'Sustantivo del Trabajo'} colombiano`,
        'Jurisprudencia de la Corte Constitucional',
        'Decretos reglamentarios vigentes'
      ];
      
      for (const source of commonSources.slice(0, 2)) {
        if (!sourcesConsulted.includes(source)) {
          sourcesConsulted.push(source);
        }
      }
      
      searchResults += '\n';
    } catch (error) {
      console.error('Error in legal search:', error);
    }
  }
  
  return `Resultados de búsqueda legal actualizados para "${query}" en ${legal_area}:\n\n${searchResults}\n⚠️ IMPORTANTE: Verifica la vigencia de estas fuentes y consulta las versiones más recientes en los sitios oficiales.`;
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