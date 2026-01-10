import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { 
  buildResponsesRequestParams, 
  callResponsesAPI, 
  logResponsesRequest 
} from "../_shared/openai-responses-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, eventDescription, documentText } = body;

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OpenAI API key not configured');

    const model = 'gpt-4o-mini';

    // Extract dates from document text
    if (action === 'extract_dates') {
      if (!documentText) {
        return new Response(
          JSON.stringify({ error: 'Document text is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      logResponsesRequest(model, 'process-calendar-events-extract', true);

      const instructions = `Eres un asistente legal colombiano especializado en extraer fechas de documentos judiciales.

Analiza el documento y extrae TODAS las fechas importantes que encuentres, incluyendo:
- Audiencias programadas
- Vencimientos de términos
- Fechas de notificación
- Plazos para presentar recursos
- Fechas de presentación de documentos
- Cualquier otra fecha legal relevante

Para cada fecha extraída, determina:
1. La fecha exacta en formato YYYY-MM-DD
2. El tipo de evento (audiencia, vencimiento, notificacion, presentacion, recurso, otro)
3. Una descripción clara del evento
4. La prioridad (alta, media, baja) basándote en la urgencia

Responde ÚNICAMENTE con un JSON válido:
{
  "dates": [
    {
      "date": "YYYY-MM-DD",
      "type": "audiencia|vencimiento|notificacion|presentacion|recurso|otro",
      "description": "Descripción del evento",
      "priority": "alta|media|baja"
    }
  ]
}

Si no encuentras fechas específicas, devuelve: {"dates": []}`;

      const params = buildResponsesRequestParams(model, {
        input: `Extrae las fechas importantes de este documento judicial:\n\n${documentText}`,
        instructions,
        maxOutputTokens: 2000,
        temperature: 0.2,
        jsonMode: true,
        store: false,
        reasoning: { effort: 'medium' }
      });

      const result = await callResponsesAPI(openaiApiKey, params);

      if (!result.success) {
        throw new Error(`Date extraction failed: ${result.error}`);
      }

      let extracted;
      try {
        extracted = JSON.parse(result.text || '{"dates": []}');
      } catch (e) {
        console.error('Failed to parse AI response:', result.text);
        extracted = { dates: [] };
      }

      console.log(`✅ Extracted ${extracted.dates?.length || 0} dates from document`);

      return new Response(
        JSON.stringify({ success: true, dates: extracted.dates || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default action: process event description
    if (!eventDescription) {
      return new Response(
        JSON.stringify({ error: 'Event description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logResponsesRequest(model, 'process-calendar-events', true);

    const instructions = `Eres un asistente legal especializado en gestión de calendario y eventos legales. Analiza descripciones de eventos y extrae información útil.

Extrae y organiza:
- Eventos identificados con fechas, horarios y tipos
- Recordatorios sugeridos
- Cronograma de preparación
- Acciones específicas para abogados

Responde en formato JSON:
{
  "events": [{"title": "nombre", "date": "fecha", "type": "tipo", "description": "descripción", "priority": "alta/media/baja"}],
  "reminders": ["recordatorio1", "recordatorio2"],
  "timeline": ["cronograma1", "cronograma2"],
  "actions": ["acción1", "acción2"],
  "analysis": "análisis completo en markdown"
}`;

    const input = `Analiza esta descripción de evento legal:\n\n${eventDescription}`;

    const params = buildResponsesRequestParams(model, {
      input,
      instructions,
      maxOutputTokens: 2000,
      temperature: 0.3,
      jsonMode: true,
      store: false,
      reasoning: { effort: 'low' }
    });

    const result = await callResponsesAPI(openaiApiKey, params);

    if (!result.success) {
      throw new Error(`Calendar processing failed: ${result.error}`);
    }

    let analysis;
    try {
      analysis = JSON.parse(result.text || '{}');
    } catch (e) {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      analysis = {
        events: [{ title: "Evento Legal", date: nextWeek.toLocaleDateString('es-ES'), type: "Actividad Legal", description: eventDescription, priority: "media" }],
        reminders: ["Revisar 3 días antes", "Confirmar 1 día antes"],
        timeline: ["1 semana antes: Planificación", "3 días antes: Revisión"],
        actions: ["Programar en calendario", "Preparar documentación"],
        analysis: result.text || ''
      };
    }

    console.log('✅ Calendar events processed');

    return new Response(
      JSON.stringify({ success: true, ...analysis, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in process-calendar-events:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
