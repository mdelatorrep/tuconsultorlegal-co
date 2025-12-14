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

const getSystemConfig = async (supabaseClient: any, configKey: string, defaultValue: string): Promise<string> => {
  try {
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .single();
    
    if (error || !data) {
      console.log(`Using default value for ${configKey}:`, defaultValue);
      return defaultValue;
    }
    
    return data.config_value;
  } catch (e) {
    console.error(`Error fetching config ${configKey}:`, e);
    return defaultValue;
  }
};

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

    const configuredModel = await getSystemConfig(supabaseClient, 'document_chat_ai_model', 'gpt-4.1-2025-04-14');
    logResponsesRequest(configuredModel, 'document-chat', true);

    const { message, messages, agent_prompt, document_name, sessionId, agentType, context } = await req.json();

    // Handle different chat types
    if (agentType === 'routing') {
      // Legal consultation routing logic - get prompt from config
      const routingInstructions = await getSystemConfig(supabaseClient, 'routing_chat_prompt', '');
      
      if (!routingInstructions) {
        console.error('❌ routing_chat_prompt not configured in system_config');
        return new Response(JSON.stringify({ error: 'Configuración faltante: routing_chat_prompt' }), { 
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

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
      // General legal assistant - Lexi - get prompt from config
      const lexiInstructions = await getSystemConfig(supabaseClient, 'lexi_chat_prompt', '');
      
      if (!lexiInstructions) {
        console.error('❌ lexi_chat_prompt not configured in system_config');
        return new Response(JSON.stringify({ error: 'Configuración faltante: lexi_chat_prompt' }), { 
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

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

    // Get document chat prompt from config
    const documentChatPrompt = await getSystemConfig(supabaseClient, 'document_chat_prompt', `INSTRUCCIONES CRÍTICAS PARA RECOPILACIÓN DE INFORMACIÓN:
- Debes recopilar TODA la información necesaria ANTES de permitir generar el documento
- Haz UNA pregunta específica y clara a la vez para cada campo requerido
- Normaliza automáticamente la información mientras la recopilas:
  * Nombres y apellidos: MAYÚSCULAS COMPLETAS
  * Ciudades: MAYÚSCULAS + departamento (ej: BOGOTÁ, CUNDINAMARCA)
  * Cédulas: formato con puntos separadores (ej: 1.234.567.890)
  * Fechas: formato DD de MMMM de YYYY
- Presenta un resumen completo de TODA la información recopilada antes de proceder
- SOLO cuando tengas TODOS los campos completos, responde: "He recopilado toda la información necesaria. ¿Deseas proceder con la generación del documento?"
- NO permitas generar el documento hasta verificar que TODOS los campos estén completos
- Si falta información, solicítala específicamente

IMPORTANTE - FORMATO DE RESPUESTA:
- NO uses asteriscos (*) para enfatizar texto
- NO uses guiones bajos (_) para cursiva
- NO uses caracteres especiales para formatear (**, __, ##, etc.)
- Escribe en texto plano sin formato markdown`);

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
