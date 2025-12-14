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

const securityHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    console.log('🎓 AI Training Validator function called');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) throw new Error('OPENAI_API_KEY is not set');

    // Helper to get system config
    const getSystemConfig = async (key: string, defaultValue: string): Promise<string> => {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('config_value')
          .eq('config_key', key)
          .maybeSingle();
        if (error || !data) return defaultValue;
        return data.config_value;
      } catch (e) {
        return defaultValue;
      }
    };

    // Get configured model and prompt
    const selectedModel = await getSystemConfig('content_optimization_model', 'gpt-4.1-2025-04-14');
    const systemPrompt = await getSystemConfig('ai_training_validator_prompt', '');
    
    if (!systemPrompt) {
      console.error('❌ ai_training_validator_prompt not configured in system_config');
      return new Response(JSON.stringify({ error: 'Configuración faltante: ai_training_validator_prompt' }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    logResponsesRequest(selectedModel, 'ai-training-validator', true);

    const { moduleId, moduleTitle, questions, answers, lawyerId, practicalExercise } = await req.json();

    console.log(`📚 Validating module: ${moduleTitle} for lawyer: ${lawyerId}`);

    const validationPrompt = createValidationPrompt(moduleTitle, questions, answers, practicalExercise);

    const instructions = systemPrompt;

    const params = buildResponsesRequestParams(selectedModel, {
      input: `${validationPrompt}\n\nResponde ÚNICAMENTE en formato JSON válido.`,
      instructions,
      maxOutputTokens: 4000,
      temperature: 0.3,
      jsonMode: true,
      store: false,
      reasoning: { effort: 'medium' }
    });

    const result = await callResponsesAPI(openAIApiKey, params);

    if (!result.success) {
      throw new Error(`Validation failed: ${result.error}`);
    }

    let evaluationResult;
    try {
      evaluationResult = JSON.parse(result.text || '{}');
    } catch (parseError) {
      evaluationResult = {
        passed: false,
        totalScore: 0,
        maxScore: 100,
        questionResults: [],
        overallFeedback: "Error en la evaluación automática.",
        recommendations: ["Revisar el sistema"],
        nextSteps: "Contactar soporte"
      };
    }

    console.log(`📊 Evaluation result: ${evaluationResult.passed ? 'PASSED' : 'FAILED'} - Score: ${evaluationResult.totalScore}/${evaluationResult.maxScore}`);

    // Store validation result
    await supabase
      .from('training_validations')
      .insert({
        lawyer_id: lawyerId,
        module_id: moduleId,
        module_title: moduleTitle,
        questions,
        answers,
        ai_evaluation: evaluationResult,
        passed: evaluationResult.passed,
        score: evaluationResult.totalScore,
        max_score: evaluationResult.maxScore,
        validated_at: new Date().toISOString()
      });

    // Update progress if passed
    if (evaluationResult.passed) {
      await supabase.functions.invoke('update-training-progress', {
        body: { lawyer_id: lawyerId, module_id: moduleId, validated: true, score: evaluationResult.totalScore }
      });
    }

    console.log('✅ Training validation completed');

    return new Response(JSON.stringify({
      success: true,
      validation: evaluationResult,
      message: evaluationResult.passed 
        ? `¡Validación exitosa! Puntuación: ${evaluationResult.totalScore}/${evaluationResult.maxScore}`
        : `Validación no superada. Puntuación: ${evaluationResult.totalScore}/${evaluationResult.maxScore}`
    }), {
      headers: securityHeaders
    });

  } catch (error) {
    console.error('💥 Error in AI training validator:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error en el sistema de validación',
      details: error.message
    }), {
      status: 500,
      headers: securityHeaders
    });
  }
});

function createValidationPrompt(moduleTitle: string, questions: any[], answers: any, practicalExercise?: any): string {
  let prompt = `MÓDULO DE FORMACIÓN: ${moduleTitle}\n\nEVALUACIÓN DE RESPUESTAS:\n\n`;

  questions.forEach((question, index) => {
    const answer = answers[question.id];
    prompt += `PREGUNTA ${index + 1} (${question.points} puntos):
Tipo: ${question.type}
Enunciado: ${question.question}
${question.options ? `Opciones: ${question.options.join(', ')}` : ''}
${question.rubric ? `Criterios: ${question.rubric}` : ''}

RESPUESTA DEL CANDIDATO:
${question.type === 'multiple_choice' ? `Opción seleccionada: ${answer + 1}` : answer || 'Sin respuesta'}

---

`;
  });

  if (practicalExercise) {
    prompt += `EJERCICIO PRÁCTICO:
Título: ${practicalExercise.title}
Descripción: ${practicalExercise.description}

RESPUESTA DEL CANDIDATO:
${answers.practical_exercise || 'Sin respuesta'}

---

`;
  }

  prompt += `Evalúa con rigor profesional. Puntaje mínimo para aprobar: 70/100.`;

  return prompt;
}
