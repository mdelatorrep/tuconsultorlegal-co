import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { lawyerId, mode } = await req.json();

    if (!lawyerId) {
      return new Response(JSON.stringify({ error: 'lawyerId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if realtime voice is enabled
    const { data: enabledConfig } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'voice_realtime_enabled')
      .single();

    if (!enabledConfig || enabledConfig.config_value === 'false' || enabledConfig.config_value === false) {
      return new Response(JSON.stringify({ error: 'El modo de voz avanzado no está habilitado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate credits
    const { data: credits } = await supabase
      .from('lawyer_credits')
      .select('current_balance')
      .eq('lawyer_id', lawyerId)
      .single();

    const { data: toolCost } = await supabase
      .from('credit_tool_costs')
      .select('credit_cost')
      .eq('tool_type', 'voice_realtime')
      .eq('is_active', true)
      .single();

    const cost = toolCost?.credit_cost || 5;

    if (!credits || credits.current_balance < cost) {
      return new Response(JSON.stringify({ 
        error: `Créditos insuficientes. Necesitas ${cost} créditos.`,
        required: cost,
        available: credits?.current_balance || 0
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read configuration from system_config
    const configKeys = [
      'voice_realtime_model',
      'voice_realtime_voice', 
      'voice_realtime_instructions',
      'voice_realtime_transcription_model',
      'voice_realtime_vad_threshold',
      'voice_realtime_max_duration_seconds',
    ];

    const { data: configs } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', configKeys);

    const configMap: Record<string, string> = {};
    configs?.forEach((c: any) => {
      let val = c.config_value;
      // Strip surrounding quotes from JSON string values
      if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      configMap[c.config_key] = val;
    });

    const model = configMap['voice_realtime_model'] || 'gpt-4o-realtime-preview';
    const voice = configMap['voice_realtime_voice'] || 'coral';
    const instructions = configMap['voice_realtime_instructions'] || 
      'Eres un asistente legal experto en derecho colombiano. Responde en español colombiano formal.';
    const transcriptionModel = configMap['voice_realtime_transcription_model'] || 'whisper-1';
    const vadThreshold = parseFloat(configMap['voice_realtime_vad_threshold'] || '0.5');
    const maxDuration = parseInt(configMap['voice_realtime_max_duration_seconds'] || '300');

    // Build mode-specific instructions
    let modeInstructions = instructions;
    if (mode === 'dictation') {
      modeInstructions += '\n\nMODO DICTADO: El usuario está dictando texto legal. Repite exactamente lo que dice, mejorando la puntuación y formato. No agregues contenido propio. Solo corrige gramática si es necesario.';
    } else if (mode === 'consultation') {
      modeInstructions += '\n\nMODO CONSULTA: El usuario tiene preguntas legales. Responde citando normas colombianas cuando aplique. Sé preciso y conciso.';
    } else if (mode === 'analysis') {
      modeInstructions += '\n\nMODO ANÁLISIS: El usuario describe un caso. Analiza los hechos, identifica las áreas del derecho aplicables, y sugiere estrategias legales.';
    }

    // Create ephemeral session with OpenAI Realtime API
    console.log(`🎤 Creating realtime session for lawyer ${lawyerId}, model: ${model}, voice: ${voice}`);

    const sessionResponse = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        voice: voice,
        instructions: modeInstructions,
        input_audio_transcription: {
          model: transcriptionModel,
        },
        turn_detection: {
          type: 'server_vad',
          threshold: vadThreshold,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      }),
    });

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error('❌ OpenAI Realtime API error:', sessionResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'Error al crear sesión de voz avanzada',
        details: errorText 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sessionData = await sessionResponse.json();

    // Consume credits
    const newBalance = credits.current_balance - cost;
    await supabase
      .from('lawyer_credits')
      .update({ current_balance: newBalance, total_spent: credits.current_balance - newBalance })
      .eq('lawyer_id', lawyerId);

    await supabase
      .from('credit_transactions')
      .insert({
        lawyer_id: lawyerId,
        transaction_type: 'consumption',
        amount: -cost,
        balance_after: newBalance,
        description: `Sesión de voz avanzada (${mode || 'general'})`,
        reference_type: 'voice_realtime',
      });

    console.log(`✅ Realtime session created. Credits consumed: ${cost}. New balance: ${newBalance}`);

    return new Response(JSON.stringify({
      client_secret: sessionData.client_secret,
      session_id: sessionData.id,
      model: model,
      voice: voice,
      max_duration_seconds: maxDuration,
      credits_consumed: cost,
      balance_after: newBalance,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 realtime-session error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
