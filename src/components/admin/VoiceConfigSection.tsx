import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Save, Mic, Volume2, FileAudio, Languages, MessageSquare, Zap, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface VoiceConfigSectionProps {
  configs: { id: string; config_key: string; config_value: string; description?: string }[];
  getConfigValue: (key: string, defaultValue: string) => string;
  onSave: (key: string, value: string, description?: string) => Promise<void>;
}

const TRANSCRIPTION_MODELS = [
  { value: 'whisper-1', label: 'Whisper 1 (Recomendado)' }
];

const TTS_MODELS = [
  { value: 'tts-1', label: 'TTS-1 (Rápido)' },
  { value: 'tts-1-hd', label: 'TTS-1-HD (Alta Calidad)' }
];

const TTS_VOICES = [
  { value: 'alloy', label: 'Alloy (Neutral)' },
  { value: 'echo', label: 'Echo (Masculina)' },
  { value: 'fable', label: 'Fable (Narrativa)' },
  { value: 'onyx', label: 'Onyx (Profunda)' },
  { value: 'nova', label: 'Nova (Femenina)' },
  { value: 'shimmer', label: 'Shimmer (Suave)' }
];

const REALTIME_VOICES = [
  { value: 'alloy', label: 'Alloy (Neutral)' },
  { value: 'ash', label: 'Ash (Masculina)' },
  { value: 'ballad', label: 'Ballad (Narrativa)' },
  { value: 'coral', label: 'Coral (Femenina, Recomendada)' },
  { value: 'echo', label: 'Echo (Masculina)' },
  { value: 'sage', label: 'Sage (Neutral)' },
  { value: 'shimmer', label: 'Shimmer (Suave)' },
  { value: 'verse', label: 'Verse (Neutral)' },
];

const REALTIME_MODELS = [
  { value: 'gpt-4o-realtime-preview', label: 'GPT-4o Realtime Preview' },
  { value: 'gpt-4o-mini-realtime-preview', label: 'GPT-4o Mini Realtime Preview' },
];

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' }
];

export default function VoiceConfigSection({ configs, getConfigValue, onSave }: VoiceConfigSectionProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  // Basic voice state
  const [enabled, setEnabled] = useState(getConfigValue('voice_assistant_enabled', 'true') === 'true');
  const [transcriptionModel, setTranscriptionModel] = useState(getConfigValue('voice_transcription_model', 'whisper-1'));
  const [transcriptionLanguage, setTranscriptionLanguage] = useState(getConfigValue('voice_transcription_language', 'es'));
  const [transcriptionPrompt, setTranscriptionPrompt] = useState(getConfigValue('voice_transcription_prompt', ''));
  const [ttsModel, setTtsModel] = useState(getConfigValue('voice_tts_model', 'tts-1'));
  const [ttsVoice, setTtsVoice] = useState(getConfigValue('voice_tts_voice', 'onyx'));
  const [maxAudioSize, setMaxAudioSize] = useState(getConfigValue('voice_max_audio_size_mb', '25'));
  const [maxTextChars, setMaxTextChars] = useState(getConfigValue('voice_max_text_chars', '4096'));

  // Realtime voice state
  const [realtimeEnabled, setRealtimeEnabled] = useState(getConfigValue('voice_realtime_enabled', 'false') === 'true');
  const [realtimeModel, setRealtimeModel] = useState(getConfigValue('voice_realtime_model', 'gpt-4o-realtime-preview').replace(/"/g, ''));
  const [realtimeVoice, setRealtimeVoice] = useState(getConfigValue('voice_realtime_voice', 'coral').replace(/"/g, ''));
  const [realtimeInstructions, setRealtimeInstructions] = useState(getConfigValue('voice_realtime_instructions', '').replace(/"/g, ''));
  const [realtimeMaxDuration, setRealtimeMaxDuration] = useState(getConfigValue('voice_realtime_max_duration_seconds', '300'));
  const [realtimeVadThreshold, setRealtimeVadThreshold] = useState(getConfigValue('voice_realtime_vad_threshold', '0.5'));

  useEffect(() => {
    setEnabled(getConfigValue('voice_assistant_enabled', 'true') === 'true');
    setTranscriptionModel(getConfigValue('voice_transcription_model', 'whisper-1'));
    setTranscriptionLanguage(getConfigValue('voice_transcription_language', 'es'));
    setTranscriptionPrompt(getConfigValue('voice_transcription_prompt', ''));
    setTtsModel(getConfigValue('voice_tts_model', 'tts-1'));
    setTtsVoice(getConfigValue('voice_tts_voice', 'onyx'));
    setMaxAudioSize(getConfigValue('voice_max_audio_size_mb', '25'));
    setMaxTextChars(getConfigValue('voice_max_text_chars', '4096'));
    // Realtime
    setRealtimeEnabled(getConfigValue('voice_realtime_enabled', 'false') === 'true');
    setRealtimeModel(getConfigValue('voice_realtime_model', 'gpt-4o-realtime-preview').replace(/"/g, ''));
    setRealtimeVoice(getConfigValue('voice_realtime_voice', 'coral').replace(/"/g, ''));
    setRealtimeInstructions(getConfigValue('voice_realtime_instructions', '').replace(/"/g, ''));
    setRealtimeMaxDuration(getConfigValue('voice_realtime_max_duration_seconds', '300'));
    setRealtimeVadThreshold(getConfigValue('voice_realtime_vad_threshold', '0.5'));
  }, [configs]);

  const handleSave = async (key: string, value: string, description: string) => {
    setSaving(key);
    try {
      await onSave(key, value, description);
      toast({ title: "Guardado", description: `${description} guardado correctamente` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleToggleEnabled = async (checked: boolean) => {
    setEnabled(checked);
    await handleSave('voice_assistant_enabled', checked ? 'true' : 'false', 'Estado del asistente de voz');
  };

  const handleToggleRealtimeEnabled = async (checked: boolean) => {
    setRealtimeEnabled(checked);
    await handleSave('voice_realtime_enabled', checked ? 'true' : 'false', 'Estado del modo realtime');
  };

  const SaveButton = ({ configKey, onClick }: { configKey: string; onClick: () => void }) => (
    <Button onClick={onClick} disabled={saving === configKey} size="icon">
      {saving === configKey ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
    </Button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary" />
          Asistente de Voz
        </h2>
        <p className="text-sm text-muted-foreground">
          Configura la transcripción de audio, síntesis de voz y modo avanzado en tiempo real
        </p>
      </div>

      {/* Estado General */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Estado del Asistente</CardTitle>
              <CardDescription>Habilita o deshabilita el asistente de voz globalmente</CardDescription>
            </div>
            <Switch checked={enabled} onCheckedChange={handleToggleEnabled} disabled={saving === 'voice_assistant_enabled'} />
          </div>
        </CardHeader>
        <CardContent>
          <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Activo" : "Inactivo"}</Badge>
        </CardContent>
      </Card>

      {/* Transcripción */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileAudio className="w-4 h-4" />
            Transcripción de Audio
          </CardTitle>
          <CardDescription>Configuración para convertir audio a texto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Modelo de Transcripción</Label>
            <div className="flex gap-2">
              <Select value={transcriptionModel} onValueChange={setTranscriptionModel}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar modelo" /></SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {TRANSCRIPTION_MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <SaveButton configKey="voice_transcription_model" onClick={() => handleSave('voice_transcription_model', transcriptionModel, 'Modelo de transcripción')} />
            </div>
            <p className="text-xs text-muted-foreground"><code className="bg-muted px-1 rounded">voice_transcription_model</code></p>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label className="flex items-center gap-2"><Languages className="w-4 h-4" />Idioma de Transcripción</Label>
            <div className="flex gap-2">
              <Select value={transcriptionLanguage} onValueChange={setTranscriptionLanguage}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar idioma" /></SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <SaveButton configKey="voice_transcription_language" onClick={() => handleSave('voice_transcription_language', transcriptionLanguage, 'Idioma de transcripción')} />
            </div>
            <p className="text-xs text-muted-foreground"><code className="bg-muted px-1 rounded">voice_transcription_language</code></p>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label className="flex items-center gap-2"><MessageSquare className="w-4 h-4" />Prompt Contextual</Label>
            <p className="text-xs text-muted-foreground mb-1">Palabras clave y contexto para mejorar la precisión</p>
            <div className="flex gap-2">
              <Textarea value={transcriptionPrompt} onChange={(e) => setTranscriptionPrompt(e.target.value)} className="flex-1 min-h-[100px]" placeholder="Ej: Transcripción de audio legal en español colombiano..." />
              <SaveButton configKey="voice_transcription_prompt" onClick={() => handleSave('voice_transcription_prompt', transcriptionPrompt, 'Prompt de transcripción')} />
            </div>
            <p className="text-xs text-muted-foreground"><code className="bg-muted px-1 rounded">voice_transcription_prompt</code></p>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label>Tamaño Máximo de Audio (MB)</Label>
            <div className="flex gap-2">
              <Input type="number" min="1" max="100" value={maxAudioSize} onChange={(e) => setMaxAudioSize(e.target.value)} className="flex-1" />
              <SaveButton configKey="voice_max_audio_size_mb" onClick={() => handleSave('voice_max_audio_size_mb', maxAudioSize, 'Tamaño máximo de audio')} />
            </div>
            <p className="text-xs text-muted-foreground"><code className="bg-muted px-1 rounded">voice_max_audio_size_mb</code> • Límite de OpenAI: 25 MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Síntesis de Voz (TTS) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Síntesis de Voz (TTS)
          </CardTitle>
          <CardDescription>Configuración para convertir texto a audio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Modelo de Síntesis</Label>
            <div className="flex gap-2">
              <Select value={ttsModel} onValueChange={setTtsModel}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar modelo" /></SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {TTS_MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <SaveButton configKey="voice_tts_model" onClick={() => handleSave('voice_tts_model', ttsModel, 'Modelo TTS')} />
            </div>
            <p className="text-xs text-muted-foreground"><code className="bg-muted px-1 rounded">voice_tts_model</code></p>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label>Tipo de Voz</Label>
            <div className="flex gap-2">
              <Select value={ttsVoice} onValueChange={setTtsVoice}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar voz" /></SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {TTS_VOICES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <SaveButton configKey="voice_tts_voice" onClick={() => handleSave('voice_tts_voice', ttsVoice, 'Voz TTS')} />
            </div>
            <p className="text-xs text-muted-foreground"><code className="bg-muted px-1 rounded">voice_tts_voice</code></p>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label>Caracteres Máximos para TTS</Label>
            <div className="flex gap-2">
              <Input type="number" min="100" max="10000" value={maxTextChars} onChange={(e) => setMaxTextChars(e.target.value)} className="flex-1" />
              <SaveButton configKey="voice_max_text_chars" onClick={() => handleSave('voice_max_text_chars', maxTextChars, 'Caracteres máximos TTS')} />
            </div>
            <p className="text-xs text-muted-foreground"><code className="bg-muted px-1 rounded">voice_max_text_chars</code></p>
          </div>
        </CardContent>
      </Card>

      {/* ============ MODO AVANZADO (REALTIME) ============ */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Modo Avanzado (Realtime)
                <Badge variant="secondary" className="text-[10px]">Pro</Badge>
              </CardTitle>
              <CardDescription>Conversación de voz bidireccional en tiempo real con IA (WebRTC)</CardDescription>
            </div>
            <Switch checked={realtimeEnabled} onCheckedChange={handleToggleRealtimeEnabled} disabled={saving === 'voice_realtime_enabled'} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Badge variant={realtimeEnabled ? "default" : "secondary"}>
            {realtimeEnabled ? "Activo" : "Inactivo"}
          </Badge>

          {realtimeEnabled && (
            <>
              <Separator />
              {/* Modelo Realtime */}
              <div className="grid gap-2">
                <Label className="flex items-center gap-2"><Phone className="w-4 h-4" />Modelo Realtime</Label>
                <div className="flex gap-2">
                  <Select value={realtimeModel} onValueChange={setRealtimeModel}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar modelo" /></SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      {REALTIME_MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <SaveButton configKey="voice_realtime_model" onClick={() => handleSave('voice_realtime_model', `"${realtimeModel}"`, 'Modelo Realtime')} />
                </div>
                <p className="text-xs text-muted-foreground"><code className="bg-muted px-1 rounded">voice_realtime_model</code></p>
              </div>

              <Separator />
              {/* Voz Realtime */}
              <div className="grid gap-2">
                <Label>Voz del Asistente Realtime</Label>
                <div className="flex gap-2">
                  <Select value={realtimeVoice} onValueChange={setRealtimeVoice}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar voz" /></SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      {REALTIME_VOICES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <SaveButton configKey="voice_realtime_voice" onClick={() => handleSave('voice_realtime_voice', `"${realtimeVoice}"`, 'Voz Realtime')} />
                </div>
                <p className="text-xs text-muted-foreground"><code className="bg-muted px-1 rounded">voice_realtime_voice</code></p>
              </div>

              <Separator />
              {/* Instrucciones Realtime */}
              <div className="grid gap-2">
                <Label>Instrucciones del Asistente</Label>
                <p className="text-xs text-muted-foreground mb-1">System prompt para el asistente de voz en tiempo real</p>
                <div className="flex gap-2">
                  <Textarea value={realtimeInstructions} onChange={(e) => setRealtimeInstructions(e.target.value)} className="flex-1 min-h-[120px]" placeholder="Instrucciones para el asistente legal..." />
                  <SaveButton configKey="voice_realtime_instructions" onClick={() => handleSave('voice_realtime_instructions', `"${realtimeInstructions}"`, 'Instrucciones Realtime')} />
                </div>
                <p className="text-xs text-muted-foreground"><code className="bg-muted px-1 rounded">voice_realtime_instructions</code></p>
              </div>

              <Separator />
              {/* Duración máxima */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Duración Máxima (seg)</Label>
                  <div className="flex gap-2">
                    <Input type="number" min="60" max="1800" value={realtimeMaxDuration} onChange={(e) => setRealtimeMaxDuration(e.target.value)} className="flex-1" />
                    <SaveButton configKey="voice_realtime_max_duration_seconds" onClick={() => handleSave('voice_realtime_max_duration_seconds', realtimeMaxDuration, 'Duración máxima Realtime')} />
                  </div>
                  <p className="text-xs text-muted-foreground"><code className="bg-muted px-1 rounded">voice_realtime_max_duration_seconds</code></p>
                </div>
                <div className="grid gap-2">
                  <Label>Umbral VAD</Label>
                  <div className="flex gap-2">
                    <Input type="number" min="0.1" max="1" step="0.1" value={realtimeVadThreshold} onChange={(e) => setRealtimeVadThreshold(e.target.value)} className="flex-1" />
                    <SaveButton configKey="voice_realtime_vad_threshold" onClick={() => handleSave('voice_realtime_vad_threshold', realtimeVadThreshold, 'Umbral VAD Realtime')} />
                  </div>
                  <p className="text-xs text-muted-foreground"><code className="bg-muted px-1 rounded">voice_realtime_vad_threshold</code></p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
