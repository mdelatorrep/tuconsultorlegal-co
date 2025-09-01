import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    const { message, moduleId, moduleContent, lawyerId, chatHistory } = await req.json();

    console.log(`Processing training assistance request for module: ${moduleId}`);
    console.log(`User message: ${message}`);

    // Create specialized training assistant prompt
    const systemPrompt = `Eres un asistente especializado en IA Legal y formación para abogados. Tu misión es ayudar a abogados a aprender sobre Inteligencia Artificial aplicada al derecho.

CONTEXTO DEL MÓDULO ACTUAL:
- Título: ${moduleContent.title}
- Descripción: ${moduleContent.description}
- Dificultad: ${moduleContent.difficulty}
- Contenido: ${moduleContent.content.join('\n')}

OBJETIVOS DE APRENDIZAJE:
${moduleContent.learningObjectives.map((obj: string, i: number) => `${i + 1}. ${obj}`).join('\n')}

EJERCICIO PRÁCTICO:
- Título: ${moduleContent.practicalExercise.title}
- Descripción: ${moduleContent.practicalExercise.description}
- Prompt: ${moduleContent.practicalExercise.prompt}

TU PAPEL COMO ASISTENTE:
1. Responde preguntas específicas sobre los conceptos del módulo
2. Proporciona ejemplos prácticos y casos de uso reales
3. Aclara dudas técnicas de manera didáctica
4. Ayuda a preparar al abogado para la validación
5. Conecta la teoría con la práctica legal colombiana
6. Usa un tono profesional pero accesible

INSTRUCCIONES ESPECÍFICAS:
- Mantén las respuestas concisas pero completas
- Usa ejemplos del contexto legal colombiano cuando sea relevante
- Si la pregunta está fuera del ámbito del módulo, redirige gentilmente al contenido
- Proporciona tips prácticos para la implementación real
- Sugiere recursos adicionales cuando sea apropiado

Responde directamente a la consulta del abogado con información precisa y útil.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      // Include recent chat history for context
      ...chatHistory.slice(-5).map((msg: any) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log('Calling OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openaiModel,
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
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