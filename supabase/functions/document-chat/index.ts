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

    const { messages, agent_prompt, document_name } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
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
- Cuando tengas toda la información necesaria, indica que ya puedes proceder con la generación del documento
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