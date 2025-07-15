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

    const { clause, document_type, context } = await req.json();

    if (!clause) {
      return new Response(
        JSON.stringify({ error: 'Clause text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Improving clause for document type:', document_type);

    const prompt = `Eres un experto abogado colombiano especializado en redacción de documentos legales. 

Documento: ${document_type}
Contexto del documento: ${JSON.stringify(context)}
Cláusula propuesta por el usuario: "${clause}"

Tu tarea es mejorar y estructurar profesionalmente esta cláusula para que sea:
1. Legalmente sólida según la legislación colombiana
2. Clara y precisa en su redacción
3. Apropiada para el tipo de documento
4. Bien estructurada y profesional

Mejora la cláusula manteniendo la intención original del usuario pero con redacción jurídica profesional. Responde ÚNICAMENTE con la cláusula mejorada, sin explicaciones adicionales.`;

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
            content: 'Eres un experto abogado colombiano especializado en redacción de documentos legales.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const improvedClause = data.choices[0]?.message?.content?.trim();

    if (!improvedClause) {
      throw new Error('No response from OpenAI');
    }

    console.log('Successfully improved clause');

    return new Response(
      JSON.stringify({ 
        improvedClause,
        originalClause: clause 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in improve-clause-ai function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});