import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { documentContent, documentType, documentTokenId } = await req.json();

    console.log('Starting quality validation for document:', documentTokenId);

    // Create quality validation agent
    const qualityValidationPrompt = `
Eres un agente especializado en validación de calidad para documentos legales. Tu función es revisar documentos generados y asegurar que cumplan con los más altos estándares de calidad.

CRITERIOS DE VALIDACIÓN:

1. COMPLETITUD:
   - Verificar que todos los campos requeridos están completos
   - Asegurar que no hay placeholders sin completar ([CAMPO])
   - Confirmar que la información es coherente y lógica

2. CALIDAD DEL CONTENIDO:
   - Gramática y ortografía correctas
   - Uso apropiado de terminología legal
   - Estructura y formato profesional
   - Claridad y precisión en el lenguaje

3. CUMPLIMIENTO LEGAL:
   - Conformidad con normativas colombianas
   - Uso correcto de referencias legales
   - Inclusión de cláusulas obligatorias según el tipo de documento

4. FORMATO Y PRESENTACIÓN:
   - Estructura lógica del documento
   - Numeración correcta de cláusulas
   - Formato profesional y consistente

TIPO DE DOCUMENTO A VALIDAR: ${documentType}

INSTRUCCIONES:
1. Analiza el documento completo
2. Identifica cualquier problema o área de mejora
3. Proporciona un puntaje de calidad del 1-10
4. Lista correcciones específicas si es necesario
5. Sugiere mejoras para optimizar el documento

Por favor, valida el siguiente documento:

${documentContent}
`;

    // Call OpenAI for quality validation
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: qualityValidationPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const validationResult = data.choices[0].message.content;

    console.log('Quality validation completed');

    // Extract quality score from the validation result
    const scoreMatch = validationResult.match(/puntaje.*?(\d+)/i);
    const qualityScore = scoreMatch ? parseInt(scoreMatch[1]) : 7;

    // Determine if document needs revision
    const needsRevision = qualityScore < 8;

    // Save validation result
    const { data: validationRecord, error: saveError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: (await supabase
          .from('agent_workflows')
          .select('id')
          .eq('workflow_type', 'quality_validation')
          .single()).data?.id,
        document_token_id: documentTokenId,
        execution_data: {
          validation_result: validationResult,
          quality_score: qualityScore,
          needs_revision: needsRevision,
          agent_type: 'quality_validator',
          timestamp: new Date().toISOString()
        },
        current_step: 1,
        status: 'completed'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving validation result:', saveError);
    }

    // If document needs significant revision, create improvement suggestions
    let improvementSuggestions = null;
    if (needsRevision) {
      improvementSuggestions = await generateImprovementSuggestions(
        documentContent, 
        validationResult, 
        documentType
      );
    }

    return new Response(JSON.stringify({
      success: true,
      validation_result: validationResult,
      quality_score: qualityScore,
      needs_revision: needsRevision,
      improvement_suggestions: improvementSuggestions,
      validation_id: validationRecord?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in quality validation:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateImprovementSuggestions(documentContent: string, validationResult: string, documentType: string) {
  try {
    const improvementPrompt = `
Basándote en el siguiente resultado de validación, proporciona sugerencias específicas y accionables para mejorar el documento.

RESULTADO DE VALIDACIÓN:
${validationResult}

TIPO DE DOCUMENTO: ${documentType}

Proporciona:
1. Lista de correcciones específicas con el texto exacto a cambiar
2. Sugerencias de mejora en estructura y contenido
3. Recomendaciones para aumentar la calidad legal
4. Texto mejorado para las secciones problemáticas

Formato tu respuesta en JSON con la siguiente estructura:
{
  "corrections": [
    {"issue": "descripción del problema", "suggestion": "corrección específica"}
  ],
  "improvements": [
    {"section": "sección del documento", "suggestion": "mejora recomendada"}
  ],
  "legal_enhancements": [
    {"aspect": "aspecto legal", "recommendation": "recomendación"}
  ]
}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: improvementPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const suggestions = data.choices[0].message.content;

    try {
      return JSON.parse(suggestions);
    } catch (parseError) {
      return { raw_suggestions: suggestions };
    }

  } catch (error) {
    console.error('Error generating improvement suggestions:', error);
    return null;
  }
}