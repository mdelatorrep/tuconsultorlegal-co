import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Default configuration values
const DEFAULT_VOICE_CONFIG = {
  voice_assistant_enabled: true,
  voice_transcription_model: 'whisper-1',
  voice_transcription_language: 'es',
  voice_transcription_prompt: '',
  voice_tts_model: 'tts-1',
  voice_tts_voice: 'alloy',
  voice_max_audio_size_mb: 25,
  voice_max_text_chars: 4096
};

// Fetch configurations from system_config with fallback defaults
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
  const configKeys = Object.keys(DEFAULT_VOICE_CONFIG);

  const { data: configs, error } = await supabaseClient
    .from('system_config')
    .select('config_key, config_value')
    .in('config_key', configKeys);

  if (error) {
    console.error('[VoiceTranscription] Error fetching config, using defaults:', error);
  }

  const configMap = new Map(configs?.map((c: any) => [c.config_key, c.config_value]) || []);
  
  // Log which configs are from DB vs defaults
  const fromDb = configKeys.filter(key => configMap.has(key));
  const fromDefaults = configKeys.filter(key => !configMap.has(key));
  console.log(`[VoiceTranscription] Config from DB: ${fromDb.join(', ') || 'none'}`);
  if (fromDefaults.length > 0) {
    console.log(`[VoiceTranscription] Using defaults for: ${fromDefaults.join(', ')}`);
  }

  // Helper to get config value or default
  const getConfig = (key: string): any => {
    if (configMap.has(key)) {
      return configMap.get(key);
    }
    return DEFAULT_VOICE_CONFIG[key as keyof typeof DEFAULT_VOICE_CONFIG];
  };

  const enabledValue = getConfig('voice_assistant_enabled');
  const enabled = enabledValue === true || enabledValue === 'true';

  return {
    enabled,
    transcriptionModel: getConfig('voice_transcription_model'),
    transcriptionLanguage: getConfig('voice_transcription_language'),
    transcriptionPrompt: getConfig('voice_transcription_prompt'),
    ttsModel: getConfig('voice_tts_model'),
    ttsVoice: getConfig('voice_tts_voice'),
    maxAudioSizeMb: parseInt(String(getConfig('voice_max_audio_size_mb'))) || 25,
    maxTextChars: parseInt(String(getConfig('voice_max_text_chars'))) || 4096,
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

      // Prepare form data for OpenAI Whisper API
      const whisperFormData = new FormData();
      whisperFormData.append('file', audioFile);
      whisperFormData.append('model', config.transcriptionModel);
      whisperFormData.append('language', config.transcriptionLanguage);
      whisperFormData.append('prompt', config.transcriptionPrompt);
      whisperFormData.append('response_format', 'verbose_json');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: whisperFormData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[VoiceTranscription] Whisper API error:', errorText);
        throw new Error(`Whisper API error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[VoiceTranscription] Transcription complete: ${result.text?.length || 0} chars`);

      return new Response(JSON.stringify({
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments?.map((s: any) => ({
          start: s.start,
          end: s.end,
          text: s.text
        }))
      }), {
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
