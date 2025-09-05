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
    const { eventDescription } = await req.json();

    if (!eventDescription) {
      return new Response(
        JSON.stringify({ error: 'Event description is required' }),
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

    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un asistente legal especializado en gestión de calendario y eventos legales. Analiza descripciones de eventos y extrae información útil.

Extrae y organiza:
- Eventos identificados con fechas, horarios y tipos
- Recordatorios sugeridos
- Cronograma de preparación
- Acciones específicas para abogados

Responde en formato JSON:
{
  "events": [
    {
      "title": "nombre del evento",
      "date": "fecha estimada",
      "type": "tipo de evento legal",
      "description": "descripción detallada",
      "priority": "alta/media/baja"
    }
  ],
  "reminders": ["recordatorio1", "recordatorio2"],
  "timeline": ["cronograma1", "cronograma2"],
  "actions": ["acción1", "acción2"],
  "analysis": "análisis completo en markdown"
}`
        },
        {
          role: 'user',
          content: `Analiza esta descripción de evento legal y extrae información para gestión de calendario:

${eventDescription}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1200
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
      // Fallback: create basic analysis
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      analysis = {
        events: [
          {
            title: "Evento Legal Identificado",
            date: nextWeek.toLocaleDateString('es-ES'),
            type: "Actividad Legal",
            description: eventDescription,
            priority: "media"
          }
        ],
        reminders: [
          "Revisar documentación 3 días antes",
          "Confirmar participantes 1 día antes",
          "Preparar materiales el día anterior"
        ],
        timeline: [
          "1 semana antes: Planificación inicial",
          "3 días antes: Revisión de documentos",
          "1 día antes: Confirmaciones finales"
        ],
        actions: [
          "Programar en calendario",
          "Preparar documentación",
          "Coordinar participantes",
          "Configurar recordatorios"
        ],
        analysis: content
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
    console.error('Error in process-calendar-events function:', error);
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