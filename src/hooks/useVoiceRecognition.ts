import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseVoiceRecognitionOptions {
  onTranscript?: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  language?: string;
}

interface UseVoiceRecognitionReturn {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  interimTranscript: string;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  error: string | null;
  audioLevel: number;
}

export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}): UseVoiceRecognitionReturn {
  const { onTranscript, onInterimTranscript, language = 'es-CO' } = options;
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(average / 255);
    }
    
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      streamRef.current = stream;

      // Set up audio analyzer for level visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
      // Start audio level monitoring
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('No se pudo acceder al micrófono');
      toast.error('No se pudo acceder al micrófono');
    }
  }, [updateAudioLevel]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    return new Promise<void>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);

        // Stop audio level monitoring
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setAudioLevel(0);

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        try {
          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Create FormData for file upload
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          
          // Get the Supabase URL and anon key for direct fetch
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
          
          // Send to edge function for transcription using fetch (supabase.functions.invoke doesn't support FormData well)
          const response = await fetch(`${supabaseUrl}/functions/v1/voice-transcription`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: formData
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error en transcripción');
          }
          
          const data = await response.json();

          const transcribedText = data.text || '';
          setTranscript(prev => prev + (prev ? ' ' : '') + transcribedText);
          setInterimTranscript('');
          onTranscript?.(transcribedText);
          
          if (transcribedText) {
            toast.success('Transcripción completada');
          } else {
            toast.info('No se detectó voz');
          }
          
          setIsProcessing(false);
          resolve();
        } catch (err) {
          console.error('Error transcribing audio:', err);
          setError('Error al transcribir el audio');
          toast.error('Error al transcribir el audio');
          setIsProcessing(false);
          resolve();
        }
      };

      mediaRecorder.stop();
    });
  }, [isRecording, language, onTranscript]);

  return {
    isRecording,
    isProcessing,
    transcript,
    interimTranscript,
    startRecording,
    stopRecording,
    error,
    audioLevel
  };
}
