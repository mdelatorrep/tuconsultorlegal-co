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
    const { eventDescription } = await req.json();

    if (!eventDescription) {
      return new Response(
        JSON.stringify({ error: 'Event description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OpenAI API key not configured');

    const model = 'gpt-4o-mini';
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
      reasoning: { effort: 'low' } // Simple task - minimize reasoning tokens
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
