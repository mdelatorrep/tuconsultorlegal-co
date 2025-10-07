import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

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
      return new Response(JSON.stringify({ 
        error: 'Se requiere plantilla y placeholders' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🤖 Suggesting conversation blocks for:', docName);
    console.log('📝 Placeholders:', placeholders);

    // Get system configuration for AI model
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

    const systemPrompt = `Eres un asistente experto en diseño de experiencias conversacionales para documentos legales colombianos.

Tu tarea es analizar un documento legal y sus placeholders, y sugerir una estructura de bloques de conversación óptima para recopilar la información de manera natural y eficiente.

PRINCIPIOS DE DISEÑO:
1. **Flujo Natural**: Los bloques deben seguir un orden lógico de información general a específica
2. **Agrupación Semántica**: Agrupa placeholders relacionados en el mismo bloque
3. **Experiencia del Usuario**: Minimiza la fatiga cognitiva con bloques de 3-5 placeholders máximo
4. **Contexto**: Cada bloque debe tener una introducción clara que explique qué información se solicita

ESTRUCTURA DE BLOQUES TÍPICOS:
- **Información Personal/Empresarial**: Datos de identificación básicos
- **Contexto del Documento**: Información específica del caso/situación
- **Detalles Específicos**: Información técnica o legal detallada
- **Verificación Final**: Confirmación de datos importantes

Responde SOLO con un objeto JSON válido (sin markdown) con el siguiente formato:
{
  "suggestedBlocks": [
    {
      "blockName": "Nombre descriptivo del bloque",
      "introPhrase": "Frase introductoria natural y amigable (50-100 caracteres)",
      "placeholders": ["placeholder1", "placeholder2"],
      "reasoning": "Breve explicación de por qué estos placeholders van juntos"
    }
  ],
  "overallStrategy": "Explicación breve de la estrategia general de la conversación"
}`;

    const userPrompt = `Documento: ${docName}
Descripción: ${docDescription || 'N/A'}
Audiencia: ${targetAudience === 'empresas' ? 'Empresas y personas jurídicas' : 'Personas naturales'}

Placeholders disponibles:
${placeholders.map((p: string) => `- ${p}`).join('\n')}

Fragmento de plantilla (para contexto):
${docTemplate.slice(0, 800)}...

Por favor sugiere una estructura de bloques de conversación óptima para recopilar esta información.`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const aiContent = openAIData.choices[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No content received from OpenAI');
    }

    console.log('🤖 AI Response:', aiContent.slice(0, 200));

    // Parse the AI response
    let parsedResponse;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = aiContent
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      parsedResponse = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate the structure
    if (!parsedResponse.suggestedBlocks || !Array.isArray(parsedResponse.suggestedBlocks)) {
      throw new Error('Invalid response structure from AI');
    }

    // Convert to UI format
    const conversationBlocks = parsedResponse.suggestedBlocks.map((block: any, index: number) => ({
      id: `suggested-block-${index + 1}`,
      name: block.blockName || `Bloque ${index + 1}`,
      introduction: block.introPhrase || '',
      placeholders: Array.isArray(block.placeholders) ? block.placeholders : []
    }));

    console.log('✅ Generated', conversationBlocks.length, 'conversation blocks');

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
    console.error('Error in suggest-conversation-blocks:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
