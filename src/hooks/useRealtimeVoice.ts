import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type RealtimeVoiceMode = 'general' | 'dictation' | 'consultation' | 'analysis';

interface ConversationEntry {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface UseRealtimeVoiceOptions {
  lawyerId: string;
  mode?: RealtimeVoiceMode;
  onTranscript?: (text: string) => void;
  onAiResponse?: (text: string) => void;
  onError?: (error: string) => void;
}

export function useRealtimeVoice({
  lawyerId,
  mode = 'general',
  onTranscript,
  onAiResponse,
  onError,
}: UseRealtimeVoiceOptions) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentAiResponse, setCurrentAiResponse] = useState('');
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{
    creditsConsumed: number;
    balanceAfter: number;
    maxDuration: number;
  } | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentResponseRef = useRef('');
  const currentTranscriptRef = useRef('');

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsUserSpeaking(false);
    setIsAiSpeaking(false);
  }, []);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // 1. Get ephemeral key from edge function
      const { data, error: fnError } = await supabase.functions.invoke('realtime-session', {
        body: { lawyerId, mode },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Error al crear sesión');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const { client_secret, max_duration_seconds, credits_consumed, balance_after } = data;

      setSessionInfo({
        creditsConsumed: credits_consumed,
        balanceAfter: balance_after,
        maxDuration: max_duration_seconds,
      });

      // 2. Create RTCPeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 3. Set up audio output
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioElRef.current = audioEl;

      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];
      };

      // 4. Add microphone track
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 5. Set up data channel
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        console.log('🎤 Realtime data channel open');
      };

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleRealtimeEvent(msg);
        } catch (e) {
          console.warn('Failed to parse realtime event:', e);
        }
      };

      dc.onerror = (e) => {
        console.error('Data channel error:', e);
      };

      // 6. Create and set local SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 7. Send SDP to OpenAI Realtime API
      const sdpResponse = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${client_secret.value}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!sdpResponse.ok) {
        const errText = await sdpResponse.text();
        throw new Error(`Error WebRTC: ${sdpResponse.status} - ${errText}`);
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      setIsConnected(true);
      setIsConnecting(false);

      // 8. Set max duration timer
      if (max_duration_seconds > 0) {
        timerRef.current = setTimeout(() => {
          console.log('⏱️ Max session duration reached, disconnecting');
          disconnect();
        }, max_duration_seconds * 1000);
      }

      console.log('✅ Realtime voice session connected');

    } catch (err: any) {
      console.error('❌ Realtime connection error:', err);
      const errorMsg = err.message || 'Error de conexión';
      setError(errorMsg);
      onError?.(errorMsg);
      cleanup();
    }
  }, [lawyerId, mode, cleanup, onError]);

  const handleRealtimeEvent = useCallback((event: any) => {
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        setIsUserSpeaking(true);
        break;

      case 'input_audio_buffer.speech_stopped':
        setIsUserSpeaking(false);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          const text = event.transcript.trim();
          currentTranscriptRef.current = text;
          setCurrentTranscript(text);
          setConversation(prev => [...prev, { role: 'user', text, timestamp: new Date() }]);
          onTranscript?.(text);
        }
        break;

      case 'response.audio.delta':
        setIsAiSpeaking(true);
        break;

      case 'response.audio.done':
        setIsAiSpeaking(false);
        break;

      case 'response.audio_transcript.delta':
        if (event.delta) {
          currentResponseRef.current += event.delta;
          setCurrentAiResponse(currentResponseRef.current);
        }
        break;

      case 'response.audio_transcript.done':
        if (currentResponseRef.current) {
          const responseText = currentResponseRef.current;
          setConversation(prev => [...prev, { role: 'assistant', text: responseText, timestamp: new Date() }]);
          onAiResponse?.(responseText);
          currentResponseRef.current = '';
          setCurrentAiResponse('');
        }
        setIsAiSpeaking(false);
        break;

      case 'response.done':
        setIsAiSpeaking(false);
        break;

      case 'error':
        console.error('Realtime API error:', event.error);
        setError(event.error?.message || 'Error en la sesión');
        onError?.(event.error?.message || 'Error en la sesión');
        break;

      default:
        // Ignore other events
        break;
    }
  }, [onTranscript, onAiResponse, onError]);

  const disconnect = useCallback(() => {
    cleanup();
    console.log('🔌 Realtime voice session disconnected');
  }, [cleanup]);

  const sendTextMessage = useCallback((text: string) => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') {
      console.warn('Data channel not open');
      return;
    }

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    };

    dcRef.current.send(JSON.stringify(event));
    dcRef.current.send(JSON.stringify({ type: 'response.create' }));
    
    setConversation(prev => [...prev, { role: 'user', text, timestamp: new Date() }]);
  }, []);

  return {
    isConnecting,
    isConnected,
    isUserSpeaking,
    isAiSpeaking,
    currentTranscript,
    currentAiResponse,
    conversation,
    error,
    sessionInfo,
    connect,
    disconnect,
    sendTextMessage,
  };
}
