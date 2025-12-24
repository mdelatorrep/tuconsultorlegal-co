import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agent_id, session_id, message, conversation_history } = await req.json();

    if (!agent_id || !message) {
      return new Response(JSON.stringify({ error: 'agent_id and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch agent details
    const { data: agent, error: agentError } = await supabase
      .from('specialized_agents_catalog')
      .select('*')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      console.error('Agent not found:', agentError);
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build messages array for OpenAI
    const systemPrompt = agent.agent_instructions || `Eres ${agent.name}, un asistente legal especializado en ${agent.category} para el contexto legal colombiano. 

Tu rol es:
- Proporcionar orientación legal general sobre temas de ${agent.category}
- Explicar conceptos legales de manera clara y accesible
- Citar normativas colombianas relevantes cuando sea apropiado
- Recomendar siempre consultar con un abogado para casos específicos

Mantén un tono profesional pero accesible. Responde en español.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversation_history || []).slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message }
    ];

    // Determine which API to use
    let response: string;

    if (agent.openai_assistant_id) {
      // Use OpenAI Assistants API
      response = await callOpenAIAssistant(agent.openai_assistant_id, message, conversation_history);
    } else if (agent.openai_workflow_id) {
      // Use OpenAI Agent Builder workflow (when available)
      // For now, fallback to chat completions
      response = await callLovableAI(messages);
    } else {
      // Use Lovable AI Gateway (default)
      response = await callLovableAI(messages);
    }

    // Update session with new message count
    if (session_id) {
      const { error: updateError } = await supabase
        .from('specialized_agent_sessions')
        .update({
          messages_count: (conversation_history?.length || 0) + 2,
          updated_at: new Date().toISOString()
        })
        .eq('id', session_id);

      if (updateError) {
        console.error('Error updating session:', updateError);
      }
    }

    return new Response(JSON.stringify({ 
      response,
      agent_name: agent.name,
      category: agent.category
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in specialized-agent-chat:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function callLovableAI(messages: Array<{ role: string; content: string }>): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages,
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lovable AI error:', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('Payment required. Please add credits to continue.');
    }
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response generated';
}

async function callOpenAIAssistant(
  assistantId: string, 
  message: string, 
  history: Array<{ role: string; content: string }>
): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  if (!OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY not found, falling back to Lovable AI');
    return callLovableAI([
      { role: 'system', content: 'You are a helpful legal assistant.' },
      ...(history || []),
      { role: 'user', content: message }
    ]);
  }

  try {
    // Create a thread
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({})
    });

    if (!threadResponse.ok) {
      throw new Error('Failed to create thread');
    }

    const thread = await threadResponse.json();

    // Add message to thread
    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: message
      })
    });

    // Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId
      })
    });

    if (!runResponse.ok) {
      throw new Error('Failed to run assistant');
    }

    const run = await runResponse.json();

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );

      const statusData = await statusResponse.json();
      
      if (statusData.status === 'completed') {
        // Get messages
        const messagesResponse = await fetch(
          `https://api.openai.com/v1/threads/${thread.id}/messages`,
          {
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'OpenAI-Beta': 'assistants=v2'
            }
          }
        );

        const messagesData = await messagesResponse.json();
        const assistantMessage = messagesData.data?.find(
          (m: any) => m.role === 'assistant'
        );

        return assistantMessage?.content?.[0]?.text?.value || 'No response';
      }

      if (statusData.status === 'failed' || statusData.status === 'cancelled') {
        throw new Error(`Assistant run ${statusData.status}`);
      }

      attempts++;
    }

    throw new Error('Assistant response timeout');
  } catch (error) {
    console.error('OpenAI Assistant error:', error);
    // Fallback to Lovable AI
    return callLovableAI([
      { role: 'system', content: 'You are a helpful legal assistant.' },
      ...(history || []),
      { role: 'user', content: message }
    ]);
  }
}
