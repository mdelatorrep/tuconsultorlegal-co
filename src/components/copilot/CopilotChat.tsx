import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  User, 
  Bot, 
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Mic,
  MicOff,
  Square
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface CopilotChatProps {
  documentContent: string;
  documentType: string;
  lawyerId: string;
  onInsertText?: (text: string) => void;
  onApplySuggestion?: (original: string, replacement: string) => void;
}

export function CopilotChat({
  documentContent,
  documentType,
  lawyerId,
  onInsertText,
  onApplySuggestion
}: CopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de redacción legal. Puedo ayudarte a:\n\n• Mejorar cláusulas específicas\n• Sugerir términos legales apropiados\n• Detectar inconsistencias\n• Generar variantes de redacción\n\n¿En qué puedo ayudarte?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice recognition hook
  const handleVoiceTranscript = useCallback((text: string) => {
    setInput(prev => prev ? `${prev} ${text}` : text);
  }, []);

  const {
    isRecording,
    isProcessing,
    transcript,
    interimTranscript,
    startRecording,
    stopRecording,
    audioLevel
  } = useVoiceRecognition({
    onTranscript: handleVoiceTranscript,
    language: 'es-CO'
  });

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create placeholder for streaming response
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    }]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-copilot-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: messages.filter(m => m.id !== 'welcome').map(m => ({
              role: m.role,
              content: m.content
            })).concat([{ role: 'user', content: input }]),
            documentContext: documentContent.slice(0, 4000),
            documentType,
            lawyerId
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Error en la comunicación');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                  setMessages(prev => prev.map(m => 
                    m.id === assistantId 
                      ? { ...m, content: fullContent }
                      : m
                  ));
                }
              } catch {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
        }
      }

      // Mark streaming as complete
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, isStreaming: false }
          : m
      ));

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Error al procesar tu mensaje');
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const insertInDocument = (text: string) => {
    onInsertText?.(text);
    toast.success('Texto insertado en el documento');
  };

  const quickActions = [
    { label: 'Mejorar redacción', action: 'Mejora la redacción de la última cláusula que escribí' },
    { label: 'Verificar consistencia', action: 'Verifica si hay inconsistencias en el documento' },
    { label: 'Sugerir cláusula', action: 'Sugiere una cláusula de confidencialidad apropiada' },
  ];

  return (
    <Card className="flex flex-col h-full border-l-0 rounded-l-none">
      {/* Header */}
      <div className="p-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-sm">Asistente de Redacción</h3>
            <p className="text-xs text-muted-foreground">Con contexto del documento</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-2 border-b flex gap-1 flex-wrap">
        {quickActions.map((qa, idx) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => {
              setInput(qa.action);
              inputRef.current?.focus();
            }}
          >
            {qa.label}
          </Button>
        ))}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[85%] rounded-lg p-3 text-sm",
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50'
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                
                {message.role === 'assistant' && !message.isStreaming && message.id !== 'welcome' && (
                  <div className="flex gap-1 mt-2 pt-2 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => copyToClipboard(message.content, message.id)}
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      Copiar
                    </Button>
                    {onInsertText && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => insertInDocument(message.content)}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Insertar
                      </Button>
                    )}
                  </div>
                )}
                
                {message.isStreaming && (
                  <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-1" />
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t space-y-2">
        {/* Voice indicator */}
        {(isRecording || isProcessing) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            {isRecording && (
              <>
                <div className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded-full bg-destructive animate-pulse"
                    style={{ transform: `scale(${1 + audioLevel * 0.5})` }}
                  />
                  <span>Grabando...</span>
                </div>
                {interimTranscript && (
                  <span className="text-foreground italic truncate max-w-[200px]">
                    "{interimTranscript}"
                  </span>
                )}
              </>
            )}
            {isProcessing && (
              <div className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Transcribiendo...</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording ? "Dictando..." : "Escribe o dicta tu mensaje..."}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={isLoading || isRecording}
            className="text-sm"
          />
          
          {/* Voice button */}
          <Button
            size="icon"
            variant={isRecording ? "destructive" : "outline"}
            onClick={toggleRecording}
            disabled={isLoading || isProcessing}
            title={isRecording ? "Detener grabación" : "Dictar mensaje"}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRecording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          {/* Send button */}
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || isRecording}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
