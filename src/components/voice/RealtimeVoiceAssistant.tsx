import { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Mic, Phone, PhoneOff, Loader2, Copy, Send,
  PenTool, ArrowRight, MessageSquare, Scale, FileText,
  Zap, User, Bot, Coins, CheckCircle, AlertCircle, Clock
} from 'lucide-react';
import { useRealtimeVoice, type RealtimeVoiceMode } from '@/hooks/useRealtimeVoice';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { useCredits } from '@/hooks/useCredits';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RealtimeVoiceAssistantProps {
  lawyerId: string;
  onTranscriptReady?: (text: string) => void;
  onCreateDocument?: (text: string) => void;
}

const MODES: { value: RealtimeVoiceMode; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'consultation', label: 'Consulta', icon: Scale, description: 'Haz preguntas legales y recibe respuestas' },
  { value: 'analysis', label: 'Análisis', icon: FileText, description: 'Describe un caso para análisis legal' },
];

function formatTime(date: Date) {
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function RealtimeVoiceAssistant({ lawyerId, onTranscriptReady, onCreateDocument }: RealtimeVoiceAssistantProps) {
  const [mode, setMode] = useState<RealtimeVoiceMode>('consultation');
  const [textInput, setTextInput] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const { getConfigValue } = useSystemConfig();
  const { balance, toolCosts } = useCredits(lawyerId);

  // Calculate dynamic cost based on model + mode
  const costInfo = useMemo(() => {
    const model = getConfigValue('voice_realtime_model', 'gpt-4o-realtime-preview').replace(/"/g, '');
    const isMinModel = model.includes('mini');
    const toolType = isMinModel ? 'voice_realtime_mini' : 'voice_realtime';
    const tool = toolCosts.find(t => t.tool_type === toolType);
    const baseCost = tool?.credit_cost || (isMinModel ? 1 : 5);
    
    const multiplierKey = `voice_realtime_mode_multiplier_${mode}`;
    const multiplier = parseFloat(getConfigValue(multiplierKey, '1.0').replace(/"/g, ''));
    
    const finalCost = Math.max(1, Math.round(baseCost * multiplier));
    const currentBalance = balance?.current_balance || 0;
    
    return {
      baseCost,
      multiplier,
      finalCost,
      isMinModel,
      modelLabel: isMinModel ? 'Mini' : 'Pro',
      toolType,
      hasEnough: currentBalance >= finalCost,
      currentBalance,
    };
  }, [mode, toolCosts, balance, getConfigValue]);

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

  // Session timer
  useEffect(() => {
    if (isConnected && !sessionStartTime) {
      setSessionStartTime(new Date());
      setElapsedSeconds(0);
    }
    if (!isConnected) {
      setSessionStartTime(null);
    }
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, currentAiResponse, currentTranscript]);

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
    const text = conversation.map(e => 
      `[${formatTime(e.timestamp)}] ${e.role === 'user' ? 'Tú' : 'Asistente'}: ${e.text}`
    ).join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Conversación copiada');
  };

  const getFullTranscript = () => {
    return conversation.filter(e => e.role === 'user').map(e => e.text).join(' ');
  };

  const getFullAiResponse = () => {
    return conversation.filter(e => e.role === 'assistant').map(e => e.text).join(' ');
  };

  // Group consecutive messages and compute exchange count
  const exchangeCount = useMemo(() => {
    return conversation.filter(e => e.role === 'user').length;
  }, [conversation]);

  return (
    <div className="flex flex-col gap-4">
      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-2">
        {MODES.map(m => {
          const mKey = `voice_realtime_mode_multiplier_${m.value}`;
          const mMult = parseFloat(getConfigValue(mKey, '1.0').replace(/"/g, ''));
          const model = getConfigValue('voice_realtime_model', 'gpt-4o-realtime-preview').replace(/"/g, '');
          const isMin = model.includes('mini');
          const tool = toolCosts.find(t => t.tool_type === (isMin ? 'voice_realtime_mini' : 'voice_realtime'));
          const base = tool?.credit_cost || (isMin ? 1 : 5);
          const modeCost = Math.max(1, Math.round(base * mMult));

          return (
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
              <span className="text-[10px] opacity-70 flex items-center gap-0.5">
                <Coins className="h-2.5 w-2.5" />
                {modeCost}
              </span>
            </Button>
          );
        })}
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
              <Badge variant="secondary" className="text-[10px]">{costInfo.modelLabel}</Badge>
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "gap-1 cursor-help",
                      costInfo.hasEnough 
                        ? "border-green-500 text-green-700 dark:text-green-400" 
                        : "border-destructive text-destructive"
                    )}
                  >
                    <Coins className="h-3 w-3" />
                    <span>{costInfo.finalCost}</span>
                    {costInfo.hasEnough ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Costo de sesión</p>
                    <p className="text-muted-foreground">
                      Base ({costInfo.modelLabel}): {costInfo.baseCost} cr × {costInfo.multiplier} ({mode})
                    </p>
                    <p className="font-medium">= {costInfo.finalCost} créditos</p>
                    <p className={costInfo.hasEnough ? "text-green-600" : "text-destructive"}>
                      {costInfo.hasEnough 
                        ? `Disponible (tienes ${costInfo.currentBalance})` 
                        : `Insuficiente (tienes ${costInfo.currentBalance})`
                      }
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Button */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
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
                disabled={isConnecting || !costInfo.hasEnough}
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
              {isConnected && (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDuration(elapsedSeconds)}
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
              {!costInfo.hasEnough
                ? 'Créditos insuficientes para esta sesión'
                : isConnecting
                  ? 'Conectando con el asistente...'
                  : isConnected
                    ? 'Habla y el asistente responderá en tiempo real'
                    : 'Presiona para iniciar una conversación de voz'}
            </p>

            {/* Session credit info bar */}
            {sessionInfo && isConnected && (
              <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  -{sessionInfo.creditsConsumed} cr
                </span>
                <span>Balance: {sessionInfo.balanceAfter}</span>
                <span>Máx: {Math.floor(sessionInfo.maxDuration / 60)}m</span>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Text input */}
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

      {/* Conversation History — chat-style */}
      {(conversation.length > 0 || (isConnected && (currentTranscript || currentAiResponse))) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Conversación
                {exchangeCount > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {exchangeCount} intercambio{exchangeCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={handleCopyConversation} disabled={conversation.length === 0}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
              </div>
            </CardTitle>
            {sessionInfo && (
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  Costo: {sessionInfo.creditsConsumed} cr
                </span>
                <span>•</span>
                <span>Modo: {MODES.find(m => m.value === mode)?.label}</span>
                <span>•</span>
                <span>Modelo: {costInfo.modelLabel}</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[300px] pr-2">
              <div className="space-y-1 py-2">
                {conversation.map((entry, i) => {
                  const isUser = entry.role === 'user';
                  // Show timestamp separator if >30s gap from previous
                  const showTimeSep = i === 0 || 
                    (entry.timestamp.getTime() - conversation[i - 1].timestamp.getTime() > 30000);

                  return (
                    <div key={i}>
                      {showTimeSep && (
                        <div className="flex justify-center my-2">
                          <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                            {formatTime(entry.timestamp)}
                          </span>
                        </div>
                      )}
                      <div className={cn(
                        "flex gap-2 max-w-[90%]",
                        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}>
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1",
                          isUser ? "bg-muted-foreground/20" : "bg-primary/20"
                        )}>
                          {isUser 
                            ? <User className="h-3 w-3" /> 
                            : <Bot className="h-3 w-3 text-primary" />}
                        </div>
                        <div className={cn(
                          "px-3 py-2 rounded-2xl text-sm leading-relaxed",
                          isUser 
                            ? "bg-primary text-primary-foreground rounded-br-md" 
                            : "bg-muted rounded-bl-md"
                        )}>
                          {entry.text}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Live typing indicators */}
                {isConnected && currentTranscript && (
                  <div className="flex gap-2 max-w-[90%] ml-auto flex-row-reverse">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 bg-muted-foreground/20">
                      <User className="h-3 w-3" />
                    </div>
                    <div className="px-3 py-2 rounded-2xl rounded-br-md text-sm leading-relaxed bg-primary/70 text-primary-foreground opacity-70">
                      {currentTranscript}
                      <span className="inline-block w-1.5 h-4 bg-primary-foreground/50 ml-1 animate-pulse rounded-sm align-text-bottom" />
                    </div>
                  </div>
                )}
                {isConnected && currentAiResponse && (
                  <div className="flex gap-2 max-w-[90%] mr-auto">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 bg-primary/20">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                    <div className="px-3 py-2 rounded-2xl rounded-bl-md text-sm leading-relaxed bg-muted opacity-80">
                      {currentAiResponse}
                      <span className="inline-block w-1.5 h-4 bg-foreground/30 ml-1 animate-pulse rounded-sm align-text-bottom" />
                    </div>
                  </div>
                )}

                <div ref={scrollEndRef} />
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
                    const text = getFullAiResponse();
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
