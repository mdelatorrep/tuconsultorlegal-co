import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { buildOpenAIRequestParams, logModelRequest } from "../_shared/openai-model-utils.ts";

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
    const { fileName } = await req.json();

    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'File name is required' }),
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

    const model = 'gpt-4o-mini';
    logModelRequest(model, 'organize-file-ai');

    const messages = [
      {
        role: 'system',
        content: `Eres un asistente especializado en organización de archivos legales. Analiza nombres de archivos y sugiere estructuras de organización.

Basándote solo en el nombre del archivo, proporciona:
- Tipo de documento probable
- Clasificación del documento
- Estructura de carpetas sugerida
- Metadatos extraíbles del nombre
- Tags para organización
- Acciones recomendadas

Responde en formato JSON:
{
  "documentType": "tipo de documento",
  "classification": "clasificación detallada",
  "folderStructure": "estructura de carpetas en formato texto",
  "metadata": ["metadato1", "metadato2"],
  "tags": ["tag1", "tag2"],
  "actions": ["acción1", "acción2"],
  "suggestedCase": "nombre del caso sugerido",
  "analysis": "análisis completo en markdown"
}`
      },
      {
        role: 'user',
        content: `Analiza este nombre de archivo legal: "${fileName}"`
      }
    ];

    const requestParams = buildOpenAIRequestParams(model, messages, {
      maxTokens: 1200,
      temperature: 0.3
    });

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestParams),
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
      analysis = {
        documentType: "Documento Legal",
        classification: `Análisis del archivo: ${fileName}`,
        folderStructure: `📁 Documentos/${new Date().getFullYear()}/📄 ${fileName}`,
        metadata: [`Archivo: ${fileName}`, `Fecha de análisis: ${new Date().toLocaleDateString()}`],
        tags: ["documento", "legal"],
        actions: ["Revisar contenido", "Clasificar manualmente"],
        suggestedCase: "Nuevo Caso",
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
    console.error('Error in organize-file-ai function:', error);
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
