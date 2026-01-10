import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Fetch required configurations from system_config
async function getVoiceConfig(supabaseClient: any): Promise<{
  enabled: boolean;
  transcriptionModel: string;
  transcriptionLanguage: string;
  transcriptionPrompt: string;
  ttsModel: string;
  ttsVoice: string;
  maxAudioSizeMb: number;
  maxTextChars: number;
}> {
  const requiredKeys = [
    'voice_assistant_enabled',
    'voice_transcription_model',
    'voice_transcription_language',
    'voice_transcription_prompt',
    'voice_tts_model',
    'voice_tts_voice',
    'voice_max_audio_size_mb',
    'voice_max_text_chars'
  ];

  const { data: configs, error } = await supabaseClient
    .from('system_config')
    .select('config_key, config_value')
    .in('config_key', requiredKeys);

  if (error) {
    console.error('[VoiceTranscription] Error fetching config:', error);
    throw new Error(`Error al obtener configuración: ${error.message}`);
  }

  const configMap = new Map(configs?.map((c: any) => [c.config_key, c.config_value]) || []);
  
  // Validate all required keys exist
  const missingKeys = requiredKeys.filter(key => !configMap.has(key));
  if (missingKeys.length > 0) {
    console.error('[VoiceTranscription] Missing config keys:', missingKeys);
    throw new Error(`Configuración faltante para asistente de voz: ${missingKeys.join(', ')}. Por favor sincronice la configuración en el panel de administración.`);
  }

  const enabledValue = configMap.get('voice_assistant_enabled');
  const enabled = enabledValue === true || enabledValue === 'true';

  return {
    enabled,
    transcriptionModel: configMap.get('voice_transcription_model') as string,
    transcriptionLanguage: configMap.get('voice_transcription_language') as string,
    transcriptionPrompt: configMap.get('voice_transcription_prompt') as string,
    ttsModel: configMap.get('voice_tts_model') as string,
    ttsVoice: configMap.get('voice_tts_voice') as string,
    maxAudioSizeMb: parseInt(configMap.get('voice_max_audio_size_mb') as string) || 25,
    maxTextChars: parseInt(configMap.get('voice_max_text_chars') as string) || 4096,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Get configuration from database
    const config = await getVoiceConfig(supabaseClient);

    if (!config.enabled) {
      return new Response(JSON.stringify({ 
        error: 'El asistente de voz está deshabilitado. Habilítelo en la configuración del sistema.' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle audio file upload for transcription
      const formData = await req.formData();
      const audioFile = formData.get('audio') as File;

      if (!audioFile) {
        return new Response(JSON.stringify({ error: 'Audio file is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check file size
      const maxSizeBytes = config.maxAudioSizeMb * 1024 * 1024;
      if (audioFile.size > maxSizeBytes) {
        return new Response(JSON.stringify({ 
          error: `El archivo de audio excede el tamaño máximo de ${config.maxAudioSizeMb}MB` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`[VoiceTranscription] Processing audio: ${audioFile.name}, size: ${audioFile.size}, model: ${config.transcriptionModel}`);

      // Prepare form data for OpenAI Transcription API
      const whisperFormData = new FormData();
      whisperFormData.append('file', audioFile);
      whisperFormData.append('model', config.transcriptionModel);
      
      // Language and prompt only supported by whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe
      // Not supported by gpt-4o-transcribe-diarize
      if (config.transcriptionModel !== 'gpt-4o-transcribe-diarize') {
        whisperFormData.append('language', config.transcriptionLanguage);
        if (config.transcriptionPrompt) {
          whisperFormData.append('prompt', config.transcriptionPrompt);
        }
      }
      
      // response_format: gpt-4o models only support 'json' or 'text', whisper-1 supports more
      const isGpt4oModel = config.transcriptionModel.startsWith('gpt-4o');
      if (isGpt4oModel) {
        whisperFormData.append('response_format', 'json');
      } else {
        whisperFormData.append('response_format', 'verbose_json');
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: whisperFormData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[VoiceTranscription] OpenAI API error:', errorText);
        throw new Error(`OpenAI Transcription API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`[VoiceTranscription] Transcription complete: ${result.text?.length || 0} chars`);

      // Build response based on model capabilities
      // gpt-4o models return simpler JSON, whisper-1 returns verbose_json with segments
      const responseData: any = {
        text: result.text,
      };

      // Only whisper-1 (verbose_json) includes these fields
      if (result.language) responseData.language = result.language;
      if (result.duration) responseData.duration = result.duration;
      if (result.segments) {
        responseData.segments = result.segments.map((s: any) => ({
          start: s.start,
          end: s.end,
          text: s.text
        }));
      }

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle JSON requests for other actions
    const { action, text } = await req.json();

    if (action === 'text_to_speech') {
      if (!text) {
        return new Response(JSON.stringify({ error: 'Text is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Limit text to configured max chars
      const truncatedText = text.slice(0, config.maxTextChars);
      
      console.log(`[VoiceTranscription] TTS request: ${truncatedText.length} chars, model: ${config.ttsModel}, voice: ${config.ttsVoice}`);

      // Generate speech from text (for reading documents aloud)
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.ttsModel,
          input: truncatedText,
          voice: config.ttsVoice,
          response_format: 'mp3',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[VoiceTranscription] TTS API error:', errorText);
        throw new Error(`TTS API error: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(audioBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      return new Response(JSON.stringify({
        audio: base64Audio,
        format: 'mp3'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action or content type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[VoiceTranscription] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
