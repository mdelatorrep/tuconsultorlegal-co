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

Tu tarea es analizar un documento legal y sus placeholders, y sugerir una estructura COMPLETA de bloques de conversación para recopilar TODA la información de manera natural y eficiente.

REGLAS CRÍTICAS:
1. DEBES crear MÚLTIPLES bloques (mínimo 2, típicamente 3-5 bloques)
2. TODOS los placeholders deben estar distribuidos entre los bloques
3. Cada bloque debe contener entre 2-5 placeholders relacionados
4. NO dejes ningún placeholder sin asignar a un bloque

PRINCIPIOS DE DISEÑO:
1. **Flujo Natural**: Los bloques deben seguir un orden lógico de información general a específica
2. **Agrupación Semántica**: Agrupa placeholders relacionados en el mismo bloque
3. **Experiencia del Usuario**: Minimiza la fatiga cognitiva con bloques de 3-5 placeholders máximo
4. **Contexto**: Cada bloque debe tener una introducción clara que explique qué información se solicita
5. **Completitud**: TODOS los placeholders deben estar incluidos en algún bloque

ESTRUCTURA DE BLOQUES TÍPICOS (crea al menos 3):
- **Bloque 1 - Información Personal/Empresarial**: Datos de identificación básicos (nombre, documento, contacto)
- **Bloque 2 - Contexto del Documento**: Información específica del caso/situación legal
- **Bloque 3 - Detalles Específicos**: Información técnica, fechas, montos, condiciones particulares
- **Bloque 4 (opcional) - Detalles Adicionales**: Otra información relevante según el documento
- **Bloque 5 (opcional) - Verificación Final**: Confirmación de datos importantes

EJEMPLO DE RESPUESTA (para un contrato con 10 placeholders):
{
  "suggestedBlocks": [
    {
      "blockName": "Información de las Partes",
      "introPhrase": "Comencemos con la información básica de las partes involucradas",
      "placeholders": ["[NOMBRE_ARRENDADOR]", "[DOCUMENTO_ARRENDADOR]", "[NOMBRE_ARRENDATARIO]", "[DOCUMENTO_ARRENDATARIO]"],
      "reasoning": "Agrupa la identificación de ambas partes del contrato"
    },
    {
      "blockName": "Detalles del Inmueble",
      "introPhrase": "Ahora necesitamos los detalles específicos del inmueble",
      "placeholders": ["[DIRECCION_INMUEBLE]", "[CIUDAD]", "[TIPO_INMUEBLE]"],
      "reasoning": "Información relacionada con la ubicación y características del bien"
    },
    {
      "blockName": "Condiciones Económicas",
      "introPhrase": "Definamos las condiciones económicas del arrendamiento",
      "placeholders": ["[VALOR_ARRIENDO]", "[DIA_PAGO]", "[VALOR_DEPOSITO]"],
      "reasoning": "Todos los aspectos financieros y de pago del contrato"
    }
  ],
  "overallStrategy": "Se organizó en 3 bloques: primero identificación, luego detalles del objeto del contrato, y finalmente aspectos económicos. Esto permite un flujo natural de lo general a lo específico."
}

Responde SOLO con un objeto JSON válido (sin markdown, sin explicaciones adicionales).`;

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

    console.log('🤖 AI Raw Response (first 500 chars):', aiContent.slice(0, 500));

    // Parse the AI response
    let parsedResponse;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = aiContent
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      console.log('🧹 Cleaned content (first 300 chars):', cleanedContent.slice(0, 300));
      parsedResponse = JSON.parse(cleanedContent);
      console.log('✅ Successfully parsed JSON response');
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', aiContent);
      console.error('Parse error:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate the structure
    if (!parsedResponse.suggestedBlocks || !Array.isArray(parsedResponse.suggestedBlocks)) {
      console.error('❌ Invalid response structure:', parsedResponse);
      throw new Error('Invalid response structure from AI');
    }

    console.log(`📦 AI generated ${parsedResponse.suggestedBlocks.length} blocks`);
    
    // Log each block summary for debugging
    parsedResponse.suggestedBlocks.forEach((block: any, idx: number) => {
      console.log(`  Block ${idx + 1}: "${block.blockName}" with ${block.placeholders?.length || 0} placeholders`);
    });

    // Convert to UI format
    const conversationBlocks = parsedResponse.suggestedBlocks.map((block: any, index: number) => ({
      id: `suggested-block-${index + 1}`,
      name: block.blockName || `Bloque ${index + 1}`,
      introduction: block.introPhrase || '',
      placeholders: Array.isArray(block.placeholders) ? block.placeholders : []
    }));

    // Validate that all placeholders are included
    const allPlaceholdersInBlocks = conversationBlocks.flatMap(b => b.placeholders);
    const missingPlaceholders = placeholders.filter((p: string) => !allPlaceholdersInBlocks.includes(p));
    
    if (missingPlaceholders.length > 0) {
      console.warn('⚠️ Some placeholders were not included in blocks:', missingPlaceholders);
    }

    console.log('✅ Generated', conversationBlocks.length, 'conversation blocks with', allPlaceholdersInBlocks.length, 'total placeholders');

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
