import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { 
  buildResponsesRequestParams, 
  callResponsesAPI, 
  logResponsesRequest 
} from "../_shared/openai-responses-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get system configuration
async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue: string): Promise<string> {
  try {
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle();
    if (error || !data) return defaultValue;
    return data.config_value;
  } catch (e) {
    return defaultValue;
  }
}

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get model and prompt from system config
    const model = await getSystemConfig(supabase, 'content_optimization_model', 'gpt-4.1-2025-04-14');
    const systemPrompt = await getSystemConfig(supabase, 'organize_file_prompt', `Eres un asistente especializado en organización de archivos legales. Analiza nombres de archivos y sugiere estructuras de organización.

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
}`);
    logResponsesRequest(model, 'organize-file-ai', true);

    const instructions = systemPrompt;

    const input = `Analiza este nombre de archivo legal: "${fileName}". Responde ÚNICAMENTE en formato JSON.`;

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
