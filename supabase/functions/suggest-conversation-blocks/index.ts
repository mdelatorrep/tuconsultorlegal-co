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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { docName, docDescription, docTemplate, placeholders, targetAudience } = await req.json();

    if (!docTemplate || !placeholders || placeholders.length === 0) {
      return new Response(JSON.stringify({ error: 'Se requiere plantilla y placeholders' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🤖 Suggesting conversation blocks for:', docName);

    // Get model from config
    let model = 'gpt-4o-mini';
    try {
      const { data: modelRow } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'agent_creation_ai_model')
        .maybeSingle();
      if (modelRow?.config_value) model = modelRow.config_value;
    } catch (e) {
      console.warn('Could not read agent_creation_ai_model, using default');
    }

    logResponsesRequest(model, 'suggest-conversation-blocks', true);

    const instructions = `Eres un asistente experto en diseño de experiencias conversacionales para documentos legales colombianos.

Tu tarea es analizar un documento legal y sus placeholders, y sugerir una estructura COMPLETA de bloques de conversación.

REGLAS CRÍTICAS:
1. DEBES crear MÚLTIPLES bloques (mínimo 2, típicamente 3-5 bloques)
2. TODOS los placeholders deben estar distribuidos entre los bloques
3. Cada bloque debe contener entre 2-5 placeholders relacionados
4. NO dejes ningún placeholder sin asignar

Responde SOLO con JSON válido.`;

    const input = `Documento: ${docName}
Descripción: ${docDescription || 'N/A'}
Audiencia: ${targetAudience === 'empresas' ? 'Empresas' : 'Personas naturales'}

Placeholders: ${placeholders.map((p: string) => p).join(', ')}

Fragmento de plantilla: ${docTemplate.slice(0, 800)}...`;

    const params = buildResponsesRequestParams(model, {
      input,
      instructions,
      maxOutputTokens: 4000,
      temperature: 0.7,
      jsonMode: true,
      store: false,
      reasoning: { effort: 'low' } // Simple task - minimize reasoning tokens
    });

    const result = await callResponsesAPI(openAIApiKey, params);

    if (!result.success) {
      throw new Error(`Block suggestion failed: ${result.error}`);
    }

    let parsedResponse;
    try {
      const cleanedContent = (result.text || '').replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsedResponse = JSON.parse(cleanedContent);
    } catch (parseError) {
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!parsedResponse.suggestedBlocks || !Array.isArray(parsedResponse.suggestedBlocks)) {
      throw new Error('Invalid response structure from AI');
    }

    const conversationBlocks = parsedResponse.suggestedBlocks.map((block: any, index: number) => ({
      id: `suggested-block-${index + 1}`,
      name: block.blockName || `Bloque ${index + 1}`,
      introduction: block.introPhrase || '',
      placeholders: Array.isArray(block.placeholders) ? block.placeholders : []
    }));

    console.log('✅ Conversation blocks suggested successfully');

    return new Response(JSON.stringify({
      success: true,
      conversationBlocks,
      strategy: parsedResponse.overallStrategy,
      reasoning: parsedResponse.suggestedBlocks.map((b: any) => ({
        blockName: b.blockName,
        reasoning: b.reasoning
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in suggest-conversation-blocks:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
