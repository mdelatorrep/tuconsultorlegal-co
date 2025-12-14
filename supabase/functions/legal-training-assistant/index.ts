import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

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

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const openaiModel = await getSystemConfig('document_chat_ai_model', 'gpt-4.1-2025-04-14');
    const basePrompt = await getSystemConfig('legal_training_assistant_prompt', '');
    
    if (!basePrompt) {
      console.error('❌ legal_training_assistant_prompt not configured in system_config');
      return new Response(JSON.stringify({ error: 'Configuración faltante: legal_training_assistant_prompt' }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logResponsesRequest(openaiModel, 'legal-training-assistant', true);

    const { message, moduleId, moduleContent, lawyerId, chatHistory, moduleProgress } = await req.json();

    console.log(`Processing training assistance for module: ${moduleId}`);

    const instructions = `${basePrompt}

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

PREGUNTAS DE VALIDACIÓN:
${moduleContent.validationQuestions.map((q: any, i: number) => 
  `Pregunta ${i + 1}: ${q.question} (${q.points} puntos)`
).join('\n')}`;

    // Build conversation history for input
    const conversationHistory = chatHistory.slice(-8).map((msg: any) => 
      `${msg.type === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`
    ).join('\n\n');

    const input = `${conversationHistory}\n\nUsuario: ${message}`;

    const params = buildResponsesRequestParams(openaiModel, {
      input,
      instructions,
      maxOutputTokens: 1200,
      temperature: 0.3,
      store: false
    });

    const result = await callResponsesAPI(openaiApiKey, params);

    if (!result.success) {
      throw new Error(`Training assistance failed: ${result.error}`);
    }

    const assistantResponse = result.text || '';
    const moduleCompleted = assistantResponse.includes('MÓDULO_COMPLETADO');
    
    if (moduleCompleted) {
      console.log(`Module ${moduleId} completed for lawyer ${lawyerId}`);
      
      try {
        await supabase.functions.invoke('update-training-progress', {
          body: {
            lawyer_id: lawyerId,
            module_name: moduleId,
            action: 'complete_module'
          }
        });
      } catch (progressError) {
        console.error('Error updating training progress:', progressError);
      }
    }

    // Log interaction
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
    }

    console.log('✅ Training assistance completed');

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      moduleCompleted,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in legal-training-assistant:', error);
    return new Response(JSON.stringify({ 
      error: 'Error processing training assistance request',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
