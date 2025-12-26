import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  buildResponsesRequestParams, 
  callResponsesAPI, 
  logResponsesRequest 
} from "../_shared/openai-responses-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get required system configuration - throws if not found
async function getRequiredConfig(supabaseClient: any, configKey: string): Promise<string> {
  const { data, error } = await supabaseClient
    .from('system_config')
    .select('config_value')
    .eq('config_key', configKey)
    .maybeSingle();

  if (error || !data?.config_value) {
    throw new Error(`Configuración '${configKey}' no encontrada en system_config. Por favor configúrela en el panel de administración.`);
  }

  return data.config_value;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const configuredModel = await getRequiredConfig(supabaseClient, 'document_chat_ai_model');
    logResponsesRequest(configuredModel, 'document-chat', true);

    const { message, messages, agent_prompt, document_name, sessionId, agentType, context } = await req.json();

    // Handle different chat types
    if (agentType === 'routing') {
      // Legal consultation routing logic - get prompt from config - NO FALLBACK
      const routingInstructions = await getRequiredConfig(supabaseClient, 'routing_chat_prompt');

      const userInput = message || (messages && messages[messages.length - 1]?.content) || '';

      const routingParams = buildResponsesRequestParams(configuredModel, {
        input: [{ role: 'user', content: `${userInput}\n\nResponde en formato JSON.` }],
        instructions: routingInstructions,
        maxOutputTokens: 500,
        temperature: 0.1,
        jsonMode: true,
        store: false,
        reasoning: { effort: 'low' }
      });

      const routingResult = await callResponsesAPI(openaiApiKey, routingParams);

      if (!routingResult.success) {
        throw new Error(routingResult.error || 'OpenAI API error');
      }

      try {
        const routingResponse = JSON.parse(routingResult.text || '{}');
        return new Response(
          JSON.stringify(routingResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        return new Response(
          JSON.stringify({ needsSpecializedAdvice: false, specialization: null, isComplex: false, reasoning: 'Unable to parse routing' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (agentType === 'lexi') {
      // General legal assistant - Lexi - get prompt from config - NO FALLBACK
      const lexiInstructions = await getRequiredConfig(supabaseClient, 'lexi_chat_prompt');

      const userMessage = message || (messages && messages[messages.length - 1]?.content) || '';
      
      const lexiParams = buildResponsesRequestParams(configuredModel, {
        input: [{ role: 'user', content: userMessage }],
        instructions: lexiInstructions,
        maxOutputTokens: 1500,
        temperature: 0.7,
        store: false,
        reasoning: { effort: 'low' }
      });

      const lexiResult = await callResponsesAPI(openaiApiKey, lexiParams);

      if (!lexiResult.success) {
        throw new Error(lexiResult.error || 'OpenAI API error');
      }

      return new Response(
        JSON.stringify({ 
          response: lexiResult.text?.trim(),
          usage: lexiResult.data?.usage
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Original document chat functionality
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required for document chat' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing chat for document:', document_name);

    // Get document chat prompt from config - NO FALLBACK
    const documentChatPrompt = await getRequiredConfig(supabaseClient, 'document_chat_prompt');

    const systemInstructions = `${agent_prompt}

- Eres un asistente legal especializado en ${document_name}
${documentChatPrompt}`;

    // Convert messages to Responses API format (user and assistant only, no system in input)
    const inputMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'system' ? 'developer' : msg.role as 'user' | 'assistant' | 'developer',
      content: msg.content
    }));

    const chatParams = buildResponsesRequestParams(configuredModel, {
      input: inputMessages,
      instructions: systemInstructions,
      maxOutputTokens: 2000,
      temperature: 0.7,
      store: false,
      reasoning: { effort: 'low' }
    });

    const chatResult = await callResponsesAPI(openaiApiKey, chatParams);

    if (!chatResult.success) {
      throw new Error(chatResult.error || 'OpenAI API error');
    }

    const assistantMessage = chatResult.text?.trim();

    if (!assistantMessage) {
      throw new Error('No response from OpenAI');
    }

    console.log('Successfully generated chat response');

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        usage: chatResult.data?.usage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in document-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
