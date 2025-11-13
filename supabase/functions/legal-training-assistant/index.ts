import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get OpenAI configuration
    const { data: config } = await supabase
      .from('system_config')
      .select('openai_api_key, openai_model')
      .eq('id', 1)
      .single();

    const openaiApiKey = config?.openai_api_key || Deno.env.get('OPENAI_API_KEY');
    const openaiModel = config?.openai_model || 'gpt-4o-mini';

    if (!openaiApiKey) {
      console.error('OpenAI API key not found');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, moduleId, moduleContent, lawyerId, chatHistory, moduleProgress } = await req.json();

    console.log(`Processing training assistance request for module: ${moduleId}`);
    console.log(`User message: ${message}`);
    console.log(`Module progress: ${JSON.stringify(moduleProgress)}`);

    // Detectar si el usuario está solicitando evaluación
    const isRequestingEvaluation = /evalua|examen|prueba|test|evaluar|completar|finalizar|listo|preparado/i.test(message);

    // Create specialized training assistant prompt
    const systemPrompt = `Eres un **Asistente Especializado en IA Legal** y formación para abogados. Tu misión es educar, evaluar y certificar a abogados en Inteligencia Artificial aplicada al derecho.

CONTEXTO DEL MÓDULO ACTUAL:
- Título: ${moduleContent.title}
- Descripción: ${moduleContent.description}
- Dificultad: ${moduleContent.difficulty}
- Estado actual: ${moduleProgress?.status || 'in_progress'}

CONTENIDO COMPLETO DEL MÓDULO:
${moduleContent.content.join('\n\n')}

OBJETIVOS DE APRENDIZAJE:
${moduleContent.learningObjectives.map((obj: string, i: number) => `${i + 1}. ${obj}`).join('\n')}

EJERCICIO PRÁCTICO:
- Título: ${moduleContent.practicalExercise.title}
- Descripción: ${moduleContent.practicalExercise.description}
- Prompt: ${moduleContent.practicalExercise.prompt}

PREGUNTAS DE VALIDACIÓN OFICIALES:
${moduleContent.validationQuestions.map((q: any, i: number) => 
  `Pregunta ${i + 1}: ${q.question} (${q.points} puntos)\nTipo: ${q.type}\n${q.options ? 'Opciones: ' + q.options.join(', ') : ''}\n${q.rubric ? 'Criterios: ' + q.rubric : ''}`
).join('\n\n')}

**SISTEMA DE EVALUACIÓN INTERACTIVA:**

SI el usuario solicita evaluación/examen (palabras clave: evaluar, examen, prueba, test, completar, listo, preparado):
1. Inicia un proceso de evaluación interactiva basado en las preguntas oficiales del módulo
2. Haz UNA pregunta a la vez y espera la respuesta antes de continuar
3. Evalúa cada respuesta según los criterios establecidos
4. Al final, calcula una puntuación total sobre 100
5. Para aprobar se requiere mínimo 80/100 puntos
6. Si aprueba, indica "MÓDULO_COMPLETADO" al final de tu respuesta
7. Si no aprueba, identifica áreas de mejora y ofrece refuerzo educativo

INSTRUCCIONES ESPECÍFICAS PARA EVALUACIÓN:
- Haz preguntas de forma conversacional pero manteniendo el rigor académico
- Evalúa tanto conocimiento teórico como aplicación práctica
- Da feedback inmediato pero constructivo
- Si el estudiante falla, explica específicamente qué necesita reforzar
- Solo usa "MÓDULO_COMPLETADO" cuando el estudiante demuestre dominio completo

**TU PAPEL COMO ASISTENTE EDUCATIVO:**
1. Responde preguntas específicas sobre los conceptos del módulo con profundidad
2. Proporciona ejemplos prácticos y casos de uso reales del contexto colombiano
3. Aclara dudas técnicas de manera didáctica y pedagógica
4. Evalúa rigurosamente el conocimiento antes de aprobar módulos
5. Refuerza conceptos cuando el estudiante no alcance el nivel requerido
6. Mantén un tono profesional pero accesible y motivador

CRITERIOS DE EVALUACIÓN ESTRICTOS:
- Precisión técnica en respuestas (40%)
- Aplicabilidad práctica al contexto legal colombiano (30%)
- Completitud y profundidad de las respuestas (20%)
- Pensamiento crítico y análisis (10%)

**IMPORTANTE:** Solo marca como completado si el estudiante demuestra verdadero dominio del tema. La certificación debe tener valor real.

Responde al abogado de manera educativa, evaluativa cuando sea apropiado, y siempre enfocado en su aprendizaje profundo.`;

    // Detectar si es una conversación de evaluación en progreso
    const isInEvaluation = chatHistory.some((msg: any) => 
      msg.type === 'assistant' && msg.content.includes('EVALUACIÓN') && !msg.content.includes('MÓDULO_COMPLETADO')
    );

    const messages = [
      { role: 'system', content: systemPrompt },
      // Include recent chat history for context
      ...chatHistory.slice(-8).map((msg: any) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log('Calling OpenAI API for training assistance...');
    console.log(`Is requesting evaluation: ${isRequestingEvaluation}`);
    console.log(`Is in evaluation: ${isInEvaluation}`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openaiModel,
        messages: messages,
        max_tokens: 1200,
        temperature: 0.3, // Lower temperature for more consistent educational responses
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;

    console.log('Training assistant response generated successfully');

    // Check if the module was completed by the AI assistant
    const moduleCompleted = assistantResponse.includes('MÓDULO_COMPLETADO');
    
    if (moduleCompleted) {
      console.log(`Module ${moduleId} completed by AI assistant for lawyer ${lawyerId}`);
      
      // Call the training progress update function
      try {
        await supabase.functions.invoke('update-training-progress', {
          body: {
            lawyer_id: lawyerId,
            module_name: moduleId,
            action: 'complete_module'
          }
        });
        console.log('Training progress updated successfully');
      } catch (progressError) {
        console.error('Error updating training progress:', progressError);
      }
    }

    // Log the interaction for improvement
    try {
      await supabase
        .from('training_interactions')
        .insert({
          lawyer_id: lawyerId,
          module_id: moduleId,
          user_message: message,
          assistant_response: assistantResponse,
          session_id: `${lawyerId}_${moduleId}_${Date.now()}`,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Error logging interaction:', logError);
      // Don't fail the request if logging fails
    }

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      moduleCompleted: moduleCompleted,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in legal-training-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: 'Error processing training assistance request',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});