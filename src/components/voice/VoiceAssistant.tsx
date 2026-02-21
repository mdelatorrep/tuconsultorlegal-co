import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mic, MicOff, Loader2, Copy, Trash2,
  FileText, Send, Volume2, PenTool, ArrowRight, Zap
} from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCredits } from '@/hooks/useCredits';
import { ToolCostIndicator } from '@/components/credits/ToolCostIndicator';
import { RealtimeVoiceAssistant } from './RealtimeVoiceAssistant';
import { useSystemConfig } from '@/hooks/useSystemConfig';

interface VoiceAssistantProps {
  lawyerId?: string;
  onTranscriptReady?: (text: string) => void;
  onCreateDocument?: (text: string) => void;
  placeholder?: string;
}

export function VoiceAssistant({ lawyerId, onTranscriptReady, onCreateDocument, placeholder }: VoiceAssistantProps) {
  const [notes, setNotes] = useState<string[]>([]);
  const [editedTranscript, setEditedTranscript] = useState('');
  
  const { consumeCredits, hasEnoughCredits, getToolCost } = useCredits(lawyerId || null);
  const { getConfigValue } = useSystemConfig();

  const realtimeEnabled = getConfigValue('voice_realtime_enabled', 'false') === 'true';

  const {
    isRecording,
    isProcessing,
    transcript,
    startRecording,
    stopRecording,
    audioLevel
  } = useVoiceRecognition({
    onTranscript: (text) => {
      setEditedTranscript(prev => prev + (prev ? ' ' : '') + text);
    }
  });

  const handleToggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
      if (lawyerId && hasEnoughCredits('voice_transcription')) {
        await consumeCredits('voice_transcription', { action: 'transcription' });
      }
    } else {
      if (lawyerId && !hasEnoughCredits('voice_transcription')) {
        toast.error(`Créditos insuficientes. Necesitas ${getToolCost('voice_transcription')} créditos para transcribir.`);
        return;
      }
      await startRecording();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedTranscript);
    toast.success('Copiado al portapapeles');
  };

  const handleClear = () => setEditedTranscript('');

  const handleSaveNote = () => {
    if (editedTranscript.trim()) {
      setNotes([...notes, editedTranscript.trim()]);
      setEditedTranscript('');
      toast.success('Nota guardada');
    }
  };

  const handleSend = () => {
    if (editedTranscript.trim()) {
      onTranscriptReady?.(editedTranscript.trim());
      setEditedTranscript('');
    }
  };

  const handleCreateDocument = () => {
    if (editedTranscript.trim()) {
      onCreateDocument?.(editedTranscript.trim());
      toast.success('Navegando al editor de documentos...');
    }
  };

  const handleDeleteNote = (index: number) => {
    setNotes(notes.filter((_, i) => i !== index));
  };

  const canUseCredits = !lawyerId || hasEnoughCredits('voice_transcription');

  // Basic voice assistant content
  const BasicAssistant = () => (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Transcripción de Voz
            </span>
            <div className="flex items-center gap-2">
              {lawyerId && <ToolCostIndicator toolType="voice_transcription" lawyerId={lawyerId} />}
              {isRecording && (
                <Badge variant="destructive" className="animate-pulse">Grabando...</Badge>
              )}
              {isProcessing && (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Procesando...
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {isRecording && (
                <div 
                  className="absolute inset-0 rounded-full bg-primary/20 animate-ping"
                  style={{ transform: `scale(${1 + audioLevel})`, opacity: audioLevel * 0.5 }}
                />
              )}
              <Button
                size="lg"
                variant={isRecording ? 'destructive' : 'default'}
                className={cn("h-20 w-20 rounded-full relative z-10", isRecording && "animate-pulse")}
                onClick={handleToggleRecording}
                disabled={isProcessing || !canUseCredits}
              >
                {isProcessing ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : isRecording ? (
                  <MicOff className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {!canUseCredits 
                ? 'Créditos insuficientes para transcribir'
                : isRecording ? 'Hablando... Haz clic para detener'
                : isProcessing ? 'Transcribiendo tu voz...'
                : 'Haz clic para empezar a dictar'}
            </p>
          </div>

          <div className="space-y-2">
            <Textarea
              value={editedTranscript}
              onChange={(e) => setEditedTranscript(e.target.value)}
              placeholder={placeholder || "La transcripción aparecerá aquí... También puedes editar el texto."}
              className="min-h-[120px]"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} disabled={!editedTranscript}>
                  <Copy className="h-4 w-4 mr-1" />Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={handleClear} disabled={!editedTranscript}>
                  <Trash2 className="h-4 w-4 mr-1" />Limpiar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleSaveNote} disabled={!editedTranscript.trim()}>
                  <FileText className="h-4 w-4 mr-1" />Guardar Nota
                </Button>
                {onCreateDocument && (
                  <Button size="sm" variant="default" onClick={handleCreateDocument} disabled={!editedTranscript.trim()}
                    className="bg-gradient-to-r from-primary to-primary/80">
                    <PenTool className="h-4 w-4 mr-1" />Crear Documento<ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
                {onTranscriptReady && (
                  <Button size="sm" variant="secondary" onClick={handleSend} disabled={!editedTranscript.trim()}>
                    <Send className="h-4 w-4 mr-1" />Usar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saved Notes */}
      {notes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Notas Guardadas ({notes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {notes.map((note, index) => (
                  <div key={index} className="flex items-start justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm flex-1">{note}</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { navigator.clipboard.writeText(note); toast.success('Copiado'); }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteNote(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <h4 className="font-medium text-sm mb-2">Consejos para mejor transcripción:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Habla claramente y a un ritmo moderado</li>
            <li>• Evita ruidos de fondo</li>
            <li>• Dicta signos de puntuación: "punto", "coma", "dos puntos"</li>
            <li>• Para nuevo párrafo di: "párrafo nuevo"</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );

  // If realtime not enabled or no lawyerId, show only basic
  if (!realtimeEnabled || !lawyerId) {
    return <BasicAssistant />;
  }

  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="basic" className="flex items-center gap-2">
          <PenTool className="h-4 w-4" />
          Dictado
        </TabsTrigger>
        <TabsTrigger value="advanced" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Avanzado
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Pro</Badge>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="basic">
        <BasicAssistant />
      </TabsContent>
      <TabsContent value="advanced">
        <RealtimeVoiceAssistant
          lawyerId={lawyerId}
          onTranscriptReady={onTranscriptReady}
          onCreateDocument={onCreateDocument}
        />
      </TabsContent>
    </Tabs>
  );
}
