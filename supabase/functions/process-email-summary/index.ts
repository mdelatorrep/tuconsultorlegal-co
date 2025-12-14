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
    const { emailContent } = await req.json();

    if (!emailContent) {
      return new Response(
        JSON.stringify({ error: 'Email content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OpenAI API key not configured');

    const model = 'gpt-4o-mini';
    logResponsesRequest(model, 'process-email-summary', true);

    const instructions = `Eres un asistente legal especializado en resumir cadenas de emails. Analiza el contenido y extrae información clave para abogados.

Extrae:
- Partes involucradas (nombres, empresas)
- Tema principal del asunto legal
- Puntos clave y fechas importantes
- Acciones sugeridas para el abogado

Responde en formato JSON:
{
  "parties": ["lista", "de", "partes"],
  "mainTopic": "tema principal",
  "keyPoints": ["punto 1", "punto 2"],
  "suggestedActions": ["acción 1", "acción 2"],
  "summary": "resumen ejecutivo completo en markdown"
}`;

    const input = `Analiza esta cadena de emails y proporciona un resumen ejecutivo:\n\n${emailContent}`;

    const params = buildResponsesRequestParams(model, {
      input,
      instructions,
      maxOutputTokens: 1500,
      temperature: 0.3,
      jsonMode: true,
      store: false
    });

    const result = await callResponsesAPI(openaiApiKey, params);

    if (!result.success) {
      throw new Error(`Email summary failed: ${result.error}`);
    }

    let analysis;
    try {
      analysis = JSON.parse(result.text || '{}');
    } catch (e) {
      analysis = {
        parties: ["Partes identificadas en el email"],
        mainTopic: "Asunto legal por revisar",
        keyPoints: ["Requiere análisis detallado"],
        suggestedActions: ["Revisar email completo", "Contactar a las partes"],
        summary: result.text || ''
      };
    }

    console.log('✅ Email summary completed');

    return new Response(
      JSON.stringify({ success: true, ...analysis, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in process-email-summary:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
