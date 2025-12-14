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
    let model = 'gpt-4.1-2025-04-14';
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

Tu tarea es analizar un documento legal y sus placeholders, y generar:
1. Bloques de conversación agrupando placeholders relacionados
2. Instrucciones específicas para cada campo (placeholder)

REGLAS CRÍTICAS:
1. DEBES crear MÚLTIPLES bloques (mínimo 2, típicamente 3-5 bloques)
2. TODOS los placeholders deben estar distribuidos entre los bloques
3. Cada bloque debe contener entre 2-5 placeholders relacionados
4. NO dejes ningún placeholder sin asignar
5. Cada bloque DEBE tener una frase de introducción amigable que el chatbot usará para iniciar esa sección
6. Para CADA placeholder, genera instrucciones de ayuda y reglas de validación

FORMATO JSON REQUERIDO:
{
  "blocks": [
    {
      "blockName": "Nombre del bloque",
      "introPhrase": "Frase amigable que el chatbot usará para introducir esta sección al usuario",
      "placeholders": ["PLACEHOLDER_1", "PLACEHOLDER_2"],
      "reasoning": "Por qué estos campos están agrupados"
    }
  ],
  "fieldInstructions": [
    {
      "fieldName": "NOMBRE_PLACEHOLDER",
      "helpText": "Texto de ayuda para el usuario explicando qué información debe proporcionar",
      "validationRule": "Regla de validación (ej: 'Debe ser un número de cédula válido', 'Formato: DD/MM/AAAA')"
    }
  ],
  "overallStrategy": "Descripción general de la estrategia de conversación"
}

Responde ÚNICAMENTE con JSON válido.`;

    const input = `Documento: ${docName}
Descripción: ${docDescription || 'N/A'}
Audiencia: ${targetAudience === 'empresas' ? 'Empresas' : 'Personas naturales'}

Placeholders a procesar: ${placeholders.map((p: string) => p).join(', ')}

Fragmento de plantilla: ${docTemplate.slice(0, 800)}...

Genera la estructura JSON completa con bloques de conversación (incluyendo introPhrase para cada bloque) e instrucciones de campo (fieldInstructions) para cada placeholder.`;

    const params = buildResponsesRequestParams(model, {
      input,
      instructions,
      maxOutputTokens: 4000,
      temperature: 0.7,
      jsonMode: true,
      store: false,
      reasoning: { effort: 'low' }
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
      console.error('Failed to parse AI response:', result.text);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Accept both 'suggestedBlocks' and 'blocks' structures from AI
    const blocksArray = parsedResponse.suggestedBlocks || parsedResponse.blocks;
    if (!blocksArray || !Array.isArray(blocksArray)) {
      console.error('Parsed response:', JSON.stringify(parsedResponse));
      throw new Error('Invalid response structure from AI - no blocks array found');
    }

    const conversationBlocks = blocksArray.map((block: any, index: number) => {
      // Extract placeholder names - handle both string arrays and object arrays with 'name' property
      let placeholderNames: string[] = [];
      if (Array.isArray(block.placeholders)) {
        placeholderNames = block.placeholders.map((p: any) => 
          typeof p === 'string' ? p : (p.name || p.placeholder || '')
        ).filter((name: string) => name);
      }
      
      return {
        id: `suggested-block-${index + 1}`,
        name: block.blockName || block.title || `Bloque ${index + 1}`,
        introduction: block.introPhrase || block.intro_phrase || block.prompt_to_user || '',
        placeholders: placeholderNames
      };
    });

    // Extract field instructions from AI response
    const fieldInstructionsArray = parsedResponse.fieldInstructions || parsedResponse.field_instructions || [];
    const fieldInstructions = fieldInstructionsArray.map((fi: any) => ({
      fieldName: fi.fieldName || fi.field_name || fi.placeholder || '',
      helpText: fi.helpText || fi.help_text || fi.description || '',
      validationRule: fi.validationRule || fi.validation_rule || fi.validation || ''
    })).filter((fi: any) => fi.fieldName);

    console.log('✅ Conversation blocks suggested successfully:', conversationBlocks.length, 'blocks,', fieldInstructions.length, 'field instructions');

    return new Response(JSON.stringify({
      success: true,
      conversationBlocks,
      fieldInstructions,
      strategy: parsedResponse.overallStrategy || parsedResponse.description || parsedResponse.strategy,
      reasoning: blocksArray.map((b: any) => ({
        blockName: b.blockName || b.title,
        reasoning: b.reasoning || b.description
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
