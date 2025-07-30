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
    const { messages, agentId, documentTokenId, threadId } = await req.json();

    console.log('Starting workflow orchestration for agent:', agentId);

    // Get the OpenAI agent by the external OpenAI agent ID
    const { data: openaiAgent, error: agentError } = await supabase
      .from('openai_agents')
      .select('*, legal_agents(*)')
      .eq('openai_agent_id', agentId)
      .eq('status', 'active')
      .single();

    if (agentError || !openaiAgent) {
      throw new Error('OpenAI agent not found');
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
        instructions: "Mantén una conversación natural y profesional. Usa las funciones disponibles según sea necesario para completar la tarea."
      })
    });

    if (!runResponse.ok) {
      throw new Error('Failed to start assistant run');
    }

    const run = await runResponse.json();
    console.log('Assistant run started:', run.id);

    // Poll for completion and handle function calls
    let runStatus = run.status;
    let runData = run;

    while (runStatus === 'in_progress' || runStatus === 'requires_action') {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

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
          console.log('Processing function call:', toolCall.function.name);
          
          let output = '';
          try {
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            switch (toolCall.function.name) {
              case 'generate_document':
                output = await handleGenerateDocument(
                  supabase, 
                  functionArgs, 
                  openaiAgent.legal_agents, 
                  documentTokenId
                );
                break;
                
              case 'validate_information':
                output = await handleValidateInformation(
                  functionArgs, 
                  openaiAgent.legal_agents.placeholder_fields
                );
                break;
                
              case 'request_clarification':
                output = await handleRequestClarification(functionArgs);
                break;
                
              default:
                output = `Función ${toolCall.function.name} no implementada`;
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

    // Save conversation to database
    await supabase
      .from('agent_conversations')
      .upsert({
        openai_agent_id: openaiAgent.id,
        thread_id: currentThreadId,
        document_token_id: documentTokenId,
        conversation_data: {
          last_message: latestMessage,
          run_status: runStatus,
          run_id: run.id
        },
        status: runStatus === 'completed' ? 'completed' : 'active'
      });

    // Update agent statistics
    const { error: statsError } = await supabase
      .from('legal_agents')
      .update({
        openai_conversations_count: openaiAgent.legal_agents.openai_conversations_count + 1,
        last_openai_activity: new Date().toISOString(),
        openai_success_rate: runStatus === 'completed' ? 
          ((openaiAgent.legal_agents.openai_success_rate || 0) * (openaiAgent.legal_agents.openai_conversations_count || 0) + (runStatus === 'completed' ? 100 : 0)) / 
          ((openaiAgent.legal_agents.openai_conversations_count || 0) + 1) : 
          openaiAgent.legal_agents.openai_success_rate
      })
      .eq('id', openaiAgent.legal_agent_id);

    if (statsError) {
      console.error('Error updating agent statistics:', statsError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: latestMessage.content[0]?.text?.value || 'No response',
      threadId: currentThreadId,
      runStatus: runStatus,
      conversationComplete: runStatus === 'completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in workflow orchestrator:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Function handlers
async function handleGenerateDocument(supabase: any, args: any, legalAgent: any, documentTokenId: string) {
  console.log('Generating document with data:', args);
  
  try {
    // Apply the template with the collected data
    let documentContent = legalAgent.template_content;
    const placeholderFields = legalAgent.placeholder_fields || [];
    
    // Replace placeholders with actual data from documentData
    for (const field of placeholderFields) {
      const placeholder = field.placeholder;
      const fieldName = field.name || placeholder;
      
      // Look for the value in the provided documentData
      let value = args.documentData[fieldName] || 
                 args.documentData[placeholder] || 
                 args.documentData[field.pregunta] || 
                 `[${placeholder}]`;
      
      // If value is still a placeholder, try to find it by question text
      if (value.startsWith('[') && value.endsWith(']')) {
        for (const [key, val] of Object.entries(args.documentData)) {
          if (key.toLowerCase().includes(fieldName.toLowerCase()) || 
              fieldName.toLowerCase().includes(key.toLowerCase())) {
            value = val as string;
            break;
          }
        }
      }
      
      // Replace all occurrences of the placeholder in the template
      const regex = new RegExp(`\\[${placeholder}\\]`, 'g');
      documentContent = documentContent.replace(regex, value);
    }
    
    // Apply any user-specific requests
    if (args.userRequests) {
      documentContent += `\n\nObservaciones adicionales: ${args.userRequests}`;
    }
    
    // Update document token with generated content if documentTokenId is provided
    if (documentTokenId) {
      const { error: updateError } = await supabase
        .from('document_tokens')
        .update({
          document_content: documentContent,
          status: 'generado',
          user_observations: args.userRequests || null
        })
        .eq('id', documentTokenId);
        
      if (updateError) {
        console.error('Error updating document token:', updateError);
      }
    }
    
    return `Documento generado exitosamente. El documento ha sido actualizado con la información proporcionada y está listo para su revisión y pago.`;
    
  } catch (error) {
    console.error('Error generating document:', error);
    return `Error al generar el documento: ${error.message}`;
  }
}

async function handleValidateInformation(args: any, placeholderFields?: any[]) {
  console.log('Validating information:', args);
  
  const collectedData = args.collectedData || {};
  const missingFields = [];
  const requiredFields = placeholderFields || [];
  
  // Check if we have all required placeholder fields
  for (const field of requiredFields) {
    const fieldName = field.name || field.placeholder;
    const fieldValue = collectedData[fieldName] || 
                       collectedData[field.placeholder] || 
                       collectedData[field.pregunta];
    
    if (!fieldValue || fieldValue.toString().trim() === '') {
      missingFields.push(field.pregunta || field.placeholder || fieldName);
    }
  }
  
  // Check other collected data
  for (const [key, value] of Object.entries(collectedData)) {
    if (!value || value.toString().trim() === '') {
      // Only add if not already in missingFields
      const fieldLabel = requiredFields.find(f => 
        f.name === key || f.placeholder === key
      )?.pregunta || key;
      
      if (!missingFields.includes(fieldLabel)) {
        missingFields.push(fieldLabel);
      }
    }
  }
  
  if (missingFields.length > 0) {
    return `Información incompleta. Faltan los siguientes campos: ${missingFields.join(', ')}. Por favor proporciona esta información antes de generar el documento.`;
  }
  
  return 'Toda la información requerida ha sido recopilada correctamente. Puedes proceder a generar el documento.';
}

async function handleRequestClarification(args: any) {
  console.log('Requesting clarification:', args);
  
  return `Necesito una aclaración sobre ${args.field || 'un campo'}: ${args.question}`;
}