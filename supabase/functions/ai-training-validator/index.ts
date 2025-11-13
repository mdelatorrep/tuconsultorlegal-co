import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const securityHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    console.log('🎓 AI Training Validator function called')

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set')
    }

    // Get configured OpenAI model
    const { data: configData, error: configError } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'openai_model')
      .maybeSingle();

    const selectedModel = (configError || !configData) 
      ? 'gpt-4.1-2025-04-14'  // Default fallback
      : configData.config_value;

    console.log('Using OpenAI model:', selectedModel);

    // Parse request body
    const { 
      moduleId, 
      moduleTitle, 
      questions, 
      answers, 
      lawyerId,
      practicalExercise 
    } = await req.json()

    console.log(`📚 Validating module: ${moduleTitle} for lawyer: ${lawyerId}`)

    // Create AI prompt for validation
    const validationPrompt = createValidationPrompt(moduleTitle, questions, answers, practicalExercise)

    console.log('🤖 Sending to OpenAI for evaluation...')

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: `Eres un experto evaluador en formación legal especializado en IA para abogados. Tu función es evaluar respuestas de abogados en formación sobre conceptos de Inteligencia Artificial aplicada al derecho.

CRITERIOS DE EVALUACIÓN:
- Precisión técnica (30%): Corrección de conceptos y términos
- Aplicabilidad práctica (25%): Relevancia para ejercicio legal real  
- Completitud (20%): Cobertura integral de la pregunta
- Pensamiento crítico (15%): Análisis profundo y consideraciones éticas
- Claridad comunicativa (10%): Estructura y expresión clara

INSTRUCCIONES:
1. Evalúa cada respuesta objetivamente
2. Proporciona puntuación específica (0-100)
3. Incluye feedback constructivo detallado
4. Identifica fortalezas y áreas de mejora
5. Sugiere recursos adicionales si es necesario
6. Determina si el candidato debe aprobar (≥70 puntos)

FORMATO DE RESPUESTA:
Devuelve un JSON con esta estructura exacta:
{
  "passed": boolean,
  "totalScore": number,
  "maxScore": number,
  "questionResults": [
    {
      "questionId": "string",
      "score": number,
      "maxScore": number,
      "feedback": "string",
      "strengths": ["string"],
      "improvements": ["string"]
    }
  ],
  "overallFeedback": "string",
  "recommendations": ["string"],
  "nextSteps": "string"
}`
          },
          {
            role: 'user',
            content: validationPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2500
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ OpenAI API error:', error)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const aiEvaluation = data.choices[0].message.content

    console.log('✅ AI evaluation completed')

    // Parse AI response
    let evaluationResult
    try {
      evaluationResult = JSON.parse(aiEvaluation)
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError)
      // Fallback response structure
      evaluationResult = {
        passed: false,
        totalScore: 0,
        maxScore: 100,
        questionResults: [],
        overallFeedback: "Error en la evaluación automática. Por favor, contacta al administrador.",
        recommendations: ["Revisar el sistema de evaluación"],
        nextSteps: "Contactar soporte técnico"
      }
    }

    console.log(`📊 Evaluation result: ${evaluationResult.passed ? 'PASSED' : 'FAILED'} - Score: ${evaluationResult.totalScore}/${evaluationResult.maxScore}`)

    // Store validation result in database
    const { error: dbError } = await supabase
      .from('training_validations')
      .insert({
        lawyer_id: lawyerId,
        module_id: moduleId,
        module_title: moduleTitle,
        questions: questions,
        answers: answers,
        ai_evaluation: evaluationResult,
        passed: evaluationResult.passed,
        score: evaluationResult.totalScore,
        max_score: evaluationResult.maxScore,
        validated_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('❌ Database error:', dbError)
      // Continue execution even if DB insert fails
    }

    // Update training progress if validation passed
    if (evaluationResult.passed) {
      console.log('🎯 Updating training progress...')
      
      const { error: progressError } = await supabase.functions.invoke('update-training-progress', {
        body: {
          lawyer_id: lawyerId,
          module_id: moduleId,
          validated: true,
          score: evaluationResult.totalScore
        }
      })

      if (progressError) {
        console.error('❌ Error updating progress:', progressError)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      validation: evaluationResult,
      message: evaluationResult.passed 
        ? `¡Validación exitosa! Puntuación: ${evaluationResult.totalScore}/${evaluationResult.maxScore}`
        : `Validación no superada. Puntuación: ${evaluationResult.totalScore}/${evaluationResult.maxScore}`
    }), {
      headers: securityHeaders
    })

  } catch (error) {
    console.error('💥 Error in AI training validator:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Error en el sistema de validación',
      details: error.message
    }), {
      status: 500,
      headers: securityHeaders
    })
  }
})

function createValidationPrompt(moduleTitle: string, questions: any[], answers: any, practicalExercise?: any): string {
  let prompt = `MÓDULO DE FORMACIÓN: ${moduleTitle}

EVALUACIÓN DE RESPUESTAS:

`

  // Add questions and answers
  questions.forEach((question, index) => {
    const answer = answers[question.id]
    
    prompt += `PREGUNTA ${index + 1} (${question.points} puntos):
Tipo: ${question.type}
Enunciado: ${question.question}
${question.options ? `Opciones: ${question.options.join(', ')}` : ''}
${question.correctAnswer !== undefined ? `Respuesta correcta: Opción ${question.correctAnswer + 1}` : ''}
${question.rubric ? `Criterios: ${question.rubric}` : ''}

RESPUESTA DEL CANDIDATO:
${question.type === 'multiple_choice' ? `Opción seleccionada: ${answer + 1}` : answer || 'Sin respuesta'}

---

`
  })

  if (practicalExercise) {
    prompt += `EJERCICIO PRÁCTICO:
Título: ${practicalExercise.title}
Descripción: ${practicalExercise.description}
Instrucciones: ${practicalExercise.prompt}

Resultados esperados:
${practicalExercise.expectedOutputs.map((output: string, i: number) => `${i + 1}. ${output}`).join('\n')}

Criterios de evaluación:
${practicalExercise.evaluationCriteria.map((criteria: string, i: number) => `${i + 1}. ${criteria}`).join('\n')}

RESPUESTA DEL CANDIDATO AL EJERCICIO:
${answers.practical_exercise || 'Sin respuesta al ejercicio práctico'}

---

`
  }

  prompt += `INSTRUCCIONES DE EVALUACIÓN:
1. Evalúa cada respuesta según los criterios establecidos
2. Para preguntas de opción múltiple, verifica si la respuesta es correcta
3. Para preguntas abiertas, evalúa según la rúbrica proporcionada
4. Considera el nivel de conocimiento esperado para un abogado en formación
5. Proporciona feedback constructivo y específico
6. El puntaje mínimo para aprobar es 70/100

Evalúa con rigor profesional pero reconoce que el candidato está en proceso de aprendizaje.`

  return prompt
}