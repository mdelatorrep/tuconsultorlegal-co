import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle audio file upload for transcription
      const formData = await req.formData();
      const audioFile = formData.get('audio') as File;
      const language = formData.get('language') as string || 'es';
      const prompt = formData.get('prompt') as string || 'Transcripción de audio legal en español.';

      if (!audioFile) {
        return new Response(JSON.stringify({ error: 'Audio file is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`[VoiceTranscription] Processing audio: ${audioFile.name}, size: ${audioFile.size}`);

      // Prepare form data for OpenAI Whisper API
      const whisperFormData = new FormData();
      whisperFormData.append('file', audioFile);
      whisperFormData.append('model', 'whisper-1');
      whisperFormData.append('language', language);
      whisperFormData.append('prompt', prompt);
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
    const { action, text, targetLanguage } = await req.json();

    if (action === 'text_to_speech') {
      // Generate speech from text (for reading documents aloud)
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text.slice(0, 4096), // Limit to 4096 chars
          voice: 'onyx', // Professional voice
          response_format: 'mp3',
        }),
      });

      if (!response.ok) {
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
