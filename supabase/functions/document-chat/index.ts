import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { message, messages, agent_prompt, document_name, sessionId, agentType, context } = await req.json();

    // Handle different chat types
    if (agentType === 'lexi') {
      // General legal assistant - Lexi
      const lexiSystemPrompt = `Eres Lexi, la asistente legal virtual de tuconsultorlegal.co, una plataforma innovadora que democratiza el acceso a servicios legales de alta calidad en Colombia.

PERSONALIDAD Y ESTILO:
- Eres amigable, profesional y cercana
- Hablas en un lenguaje claro y accesible, evitando jerga legal innecesaria
- Siempre muestras confianza y conocimiento
- Tu objetivo es ayudar y guiar a los usuarios hacia las mejores soluciones legales

CONOCIMIENTOS:
- Experta en derecho colombiano
- Conoces todos los servicios de tuconsultorlegal.co
- Puedes orientar sobre documentos legales, consultas y trámites
- Especializada en simplificar conceptos legales complejos

FUNCIONES PRINCIPALES:
1. Responder consultas legales generales
2. Orientar sobre documentos disponibles en la plataforma
3. Explicar procesos legales de manera simple
4. Conectar usuarios con servicios especializados
5. Brindar información sobre trámites y procedimientos

SERVICIOS DE TUCONSULTORLEGAL.CO:
- Documentos legales para personas y empresas
- Consultas especializadas con abogados
- Generación automatizada de documentos
- Asesoría legal personalizada
- Trámites y gestiones legales

IMPORTANTE:
- Siempre menciona que eres de tuconsultorlegal.co
- Mantén un tono profesional pero accesible
- Si algo requiere asesoría especializada, conecta al usuario con nuestros servicios
- No hagas promesas legales específicas, sino orienta y recomienda

FORMATO DE RESPUESTA:
- Usa texto plano sin formato markdown
- Sé clara y concisa
- Estructura la información de manera fácil de leer
- Incluye emojis apropiados ocasionalmente (⚖️, 📄, 💼, etc.)`;

      const userMessage = message || (messages && messages[messages.length - 1]?.content) || '';
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: lexiSystemPrompt
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          max_tokens: 800,
          temperature: 0.7,
          stream: false
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content?.trim();

      return new Response(
        JSON.stringify({ 
          response: assistantMessage,
          usage: data.usage
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

    const systemPrompt = `${agent_prompt}

INSTRUCCIONES ADICIONALES PARA EL CHAT:
- Eres un asistente legal especializado en ${document_name}
- Haz preguntas específicas y claras una a la vez
- Recopila toda la información necesaria para generar el documento
- Sé conversacional y amigable, pero profesional
- Cuando tengas toda la información necesaria, termina tu respuesta diciendo exactamente: "Ya tengo toda la información necesaria para proceder con la generación del documento."
- Si el usuario pide aclaraciones legales, proporciona información precisa según la legislación colombiana

IMPORTANTE - FORMATO DE RESPUESTA:
- NO uses asteriscos (*) para enfatizar texto
- NO uses guiones bajos (_) para cursiva
- NO uses caracteres especiales para formatear (**, __, ##, etc.)
- Escribe en texto plano sin formato markdown
- Usa solo puntos, comas y signos de puntuación normales
- Para enfatizar, usa palabras como "importante", "crucial", "especialmente"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...messages
        ],
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content?.trim();

    if (!assistantMessage) {
      throw new Error('No response from OpenAI');
    }

    console.log('Successfully generated chat response');

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        usage: data.usage
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