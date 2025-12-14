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
    const { fileName } = await req.json();

    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'File name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OpenAI API key not configured');

    const model = 'gpt-4o-mini';
    logResponsesRequest(model, 'organize-file-ai', true);

    const instructions = `Eres un asistente especializado en organización de archivos legales. Analiza nombres de archivos y sugiere estructuras de organización.

Basándote solo en el nombre del archivo, proporciona:
- Tipo de documento probable
- Clasificación del documento
- Estructura de carpetas sugerida
- Metadatos extraíbles del nombre
- Tags para organización
- Acciones recomendadas

Responde en formato JSON:
{
  "documentType": "tipo",
  "classification": "clasificación",
  "folderStructure": "estructura de carpetas",
  "metadata": ["metadato1", "metadato2"],
  "tags": ["tag1", "tag2"],
  "actions": ["acción1", "acción2"],
  "suggestedCase": "nombre del caso sugerido",
  "analysis": "análisis en markdown"
}`;

    const input = `Analiza este nombre de archivo legal: "${fileName}"`;

    const params = buildResponsesRequestParams(model, {
      input,
      instructions,
      maxOutputTokens: 1200,
      temperature: 0.3,
      jsonMode: true,
      store: false
    });

    const result = await callResponsesAPI(openaiApiKey, params);

    if (!result.success) {
      throw new Error(`File organization failed: ${result.error}`);
    }

    let analysis;
    try {
      analysis = JSON.parse(result.text || '{}');
    } catch (e) {
      analysis = {
        documentType: "Documento Legal",
        classification: `Análisis del archivo: ${fileName}`,
        folderStructure: `📁 Documentos/${new Date().getFullYear()}/📄 ${fileName}`,
        metadata: [`Archivo: ${fileName}`, `Fecha: ${new Date().toLocaleDateString()}`],
        tags: ["documento", "legal"],
        actions: ["Revisar contenido", "Clasificar manualmente"],
        suggestedCase: "Nuevo Caso",
        analysis: result.text || ''
      };
    }

    console.log('✅ File organization completed');

    return new Response(
      JSON.stringify({ success: true, ...analysis, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in organize-file-ai:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
