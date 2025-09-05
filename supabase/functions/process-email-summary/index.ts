import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emailContent } = await req.json();

    if (!emailContent) {
      return new Response(
        JSON.stringify({ error: 'Email content is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Use a smaller model for email processing
    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un asistente legal especializado en resumir cadenas de emails. Analiza el contenido y extrae información clave para abogados.

Extrae la siguiente información:
- Partes involucradas (nombres, empresas)
- Tema principal del asunto legal
- Puntos clave y fechas importantes
- Acciones sugeridas para el abogado

Responde en formato JSON con esta estructura:
{
  "parties": ["lista", "de", "partes"],
  "mainTopic": "tema principal",
  "keyPoints": ["punto 1", "punto 2"],
  "suggestedActions": ["acción 1", "acción 2"],
  "summary": "resumen ejecutivo completo en markdown"
}`
        },
        {
          role: 'user',
          content: `Analiza esta cadena de emails y proporciona un resumen ejecutivo:

${emailContent}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    };

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0].message.content;

    // Try to parse as JSON, fallback to structured response if parsing fails
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (e) {
      // Fallback: create structured response from text
      analysis = {
        parties: ["Partes identificadas en el email"],
        mainTopic: "Asunto legal por revisar",
        keyPoints: ["Requiere análisis detallado del contenido"],
        suggestedActions: ["Revisar email completo", "Contactar a las partes"],
        summary: content
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...analysis,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in process-email-summary function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});