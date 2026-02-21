import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Mic, Phone, PhoneOff, Loader2, Copy, Send,
  PenTool, ArrowRight, MessageSquare, Scale, FileText,
  Zap, User, Bot
} from 'lucide-react';
import { useRealtimeVoice, type RealtimeVoiceMode } from '@/hooks/useRealtimeVoice';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ToolCostIndicator } from '@/components/credits/ToolCostIndicator';

interface RealtimeVoiceAssistantProps {
  lawyerId: string;
  onTranscriptReady?: (text: string) => void;
  onCreateDocument?: (text: string) => void;
}

const MODES: { value: RealtimeVoiceMode; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'dictation', label: 'Dictado', icon: PenTool, description: 'Dicta y el asistente transcribe con formato legal' },
  { value: 'consultation', label: 'Consulta', icon: Scale, description: 'Haz preguntas legales y recibe respuestas' },
  { value: 'analysis', label: 'Análisis', icon: FileText, description: 'Describe un caso para análisis legal' },
];

export function RealtimeVoiceAssistant({ lawyerId, onTranscriptReady, onCreateDocument }: RealtimeVoiceAssistantProps) {
  const [mode, setMode] = useState<RealtimeVoiceMode>('consultation');
  const [textInput, setTextInput] = useState('');

  const {
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
  } = useRealtimeVoice({
    lawyerId,
    mode,
    onTranscript: (text) => {
      console.log('📝 User transcript:', text);
    },
    onAiResponse: (text) => {
      console.log('🤖 AI response:', text);
    },
    onError: (err) => {
      toast.error(err);
    },
  });

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleSendText = () => {
    if (textInput.trim()) {
      sendTextMessage(textInput.trim());
      setTextInput('');
    }
  };

  const handleCopyConversation = () => {
    const text = conversation.map(e => `${e.role === 'user' ? 'Tú' : 'Asistente'}: ${e.text}`).join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Conversación copiada');
  };

  const getFullTranscript = () => {
    return conversation.filter(e => e.role === 'user').map(e => e.text).join(' ');
  };

  const getFullAiResponse = () => {
    return conversation.filter(e => e.role === 'assistant').map(e => e.text).join(' ');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-2">
        {MODES.map(m => (
          <Button
            key={m.value}
            variant={mode === m.value ? 'default' : 'outline'}
            size="sm"
            className={cn("flex flex-col h-auto py-2 gap-1", mode === m.value && "ring-2 ring-primary/30")}
            onClick={() => setMode(m.value)}
            disabled={isConnected}
          >
            <m.icon className="h-4 w-4" />
            <span className="text-xs font-medium">{m.label}</span>
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {MODES.find(m => m.value === mode)?.description}
      </p>

      {/* Connection Card */}
      <Card className={cn(
        "border-2 transition-colors",
        isConnected ? "border-green-500/50 bg-green-50/30 dark:bg-green-950/10" : "border-border"
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Voz en Tiempo Real
              <Badge variant="secondary" className="text-[10px]">Pro</Badge>
            </span>
            <ToolCostIndicator toolType="voice_realtime" lawyerId={lawyerId} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Button */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {/* Pulse animation when speaking */}
              {isUserSpeaking && (
                <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
              )}
              {isAiSpeaking && (
                <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-pulse" />
              )}
              <Button
                size="lg"
                variant={isConnected ? 'destructive' : 'default'}
                className={cn(
                  "h-20 w-20 rounded-full relative z-10",
                  isConnecting && "animate-pulse"
                )}
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : isConnected ? (
                  <PhoneOff className="h-8 w-8" />
                ) : (
                  <Phone className="h-8 w-8" />
                )}
              </Button>
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {isConnected && (
                <Badge variant="default" className="bg-green-600">
                  <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />
                  Conectado
                </Badge>
              )}
              {isUserSpeaking && (
                <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                  <Mic className="h-3 w-3 mr-1" />
                  Hablando...
                </Badge>
              )}
              {isAiSpeaking && (
                <Badge variant="outline" className="border-blue-500 text-blue-700 dark:text-blue-400">
                  <Bot className="h-3 w-3 mr-1" />
                  Respondiendo...
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {isConnecting
                ? 'Conectando con el asistente...'
                : isConnected
                  ? 'Habla y el asistente responderá en tiempo real'
                  : 'Presiona para iniciar una conversación de voz'}
            </p>

            {sessionInfo && isConnected && (
              <p className="text-xs text-muted-foreground">
                Créditos: -{sessionInfo.creditsConsumed} • Balance: {sessionInfo.balanceAfter} • 
                Máx: {Math.floor(sessionInfo.maxDuration / 60)} min
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Live Transcription */}
          {(currentTranscript || currentAiResponse) && isConnected && (
            <div className="space-y-2">
              {currentTranscript && (
                <div className="p-2 rounded bg-muted/50 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">Tú:</span>
                  <p>{currentTranscript}</p>
                </div>
              )}
              {currentAiResponse && (
                <div className="p-2 rounded bg-primary/5 text-sm">
                  <span className="text-xs font-medium text-primary">Asistente:</span>
                  <p>{currentAiResponse}</p>
                </div>
              )}
            </div>
          )}

          {/* Text input (alternative to voice) */}
          {isConnected && (
            <div className="flex gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="También puedes escribir..."
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                className="flex-1"
              />
              <Button size="icon" onClick={handleSendText} disabled={!textInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation History */}
      {conversation.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Conversación ({conversation.length})
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={handleCopyConversation}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <div className="space-y-3">
                {conversation.map((entry, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-2 p-3 rounded-lg text-sm",
                      entry.role === 'user'
                        ? "bg-muted/50 ml-4"
                        : "bg-primary/5 mr-4"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      entry.role === 'user' ? "bg-muted-foreground/20" : "bg-primary/20"
                    )}>
                      {entry.role === 'user' 
                        ? <User className="h-3 w-3" /> 
                        : <Bot className="h-3 w-3 text-primary" />}
                    </div>
                    <p className="flex-1 leading-relaxed">{entry.text}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3 pt-3 border-t flex-wrap">
              {onTranscriptReady && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const text = getFullTranscript();
                    if (text) {
                      onTranscriptReady(text);
                      toast.success('Texto enviado');
                    }
                  }}
                  disabled={conversation.filter(e => e.role === 'user').length === 0}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Usar Transcripción
                </Button>
              )}
              {onCreateDocument && (
                <Button
                  size="sm"
                  variant="default"
                  className="bg-gradient-to-r from-primary to-primary/80"
                  onClick={() => {
                    const text = mode === 'dictation' ? getFullTranscript() : getFullAiResponse();
                    if (text) {
                      onCreateDocument(text);
                      toast.success('Navegando al editor...');
                    }
                  }}
                  disabled={conversation.length === 0}
                >
                  <PenTool className="h-3 w-3 mr-1" />
                  Crear Documento
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
