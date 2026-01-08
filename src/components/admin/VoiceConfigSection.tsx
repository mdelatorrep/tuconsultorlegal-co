import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Save, Mic, Volume2, FileAudio, Languages, MessageSquare } from "lucide-react";
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

  // State for each config
  const [enabled, setEnabled] = useState(getConfigValue('voice_assistant_enabled', 'true') === 'true');
  const [transcriptionModel, setTranscriptionModel] = useState(getConfigValue('voice_transcription_model', 'whisper-1'));
  const [transcriptionLanguage, setTranscriptionLanguage] = useState(getConfigValue('voice_transcription_language', 'es'));
  const [transcriptionPrompt, setTranscriptionPrompt] = useState(getConfigValue('voice_transcription_prompt', ''));
  const [ttsModel, setTtsModel] = useState(getConfigValue('voice_tts_model', 'tts-1'));
  const [ttsVoice, setTtsVoice] = useState(getConfigValue('voice_tts_voice', 'onyx'));
  const [maxAudioSize, setMaxAudioSize] = useState(getConfigValue('voice_max_audio_size_mb', '25'));
  const [maxTextChars, setMaxTextChars] = useState(getConfigValue('voice_max_text_chars', '4096'));

  // Update state when configs change
  useEffect(() => {
    setEnabled(getConfigValue('voice_assistant_enabled', 'true') === 'true');
    setTranscriptionModel(getConfigValue('voice_transcription_model', 'whisper-1'));
    setTranscriptionLanguage(getConfigValue('voice_transcription_language', 'es'));
    setTranscriptionPrompt(getConfigValue('voice_transcription_prompt', ''));
    setTtsModel(getConfigValue('voice_tts_model', 'tts-1'));
    setTtsVoice(getConfigValue('voice_tts_voice', 'onyx'));
    setMaxAudioSize(getConfigValue('voice_max_audio_size_mb', '25'));
    setMaxTextChars(getConfigValue('voice_max_text_chars', '4096'));
  }, [configs]);

  const handleSave = async (key: string, value: string, description: string) => {
    setSaving(key);
    try {
      await onSave(key, value, description);
      toast({
        title: "Guardado",
        description: `${description} guardado correctamente`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(null);
    }
  };

  const handleToggleEnabled = async (checked: boolean) => {
    setEnabled(checked);
    await handleSave('voice_assistant_enabled', checked ? 'true' : 'false', 'Estado del asistente de voz');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary" />
          Asistente de Voz
        </h2>
        <p className="text-sm text-muted-foreground">
          Configura la transcripción de audio y síntesis de voz
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
            <Switch
              checked={enabled}
              onCheckedChange={handleToggleEnabled}
              disabled={saving === 'voice_assistant_enabled'}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Badge variant={enabled ? "default" : "secondary"}>
            {enabled ? "Activo" : "Inactivo"}
          </Badge>
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
          {/* Modelo de Transcripción */}
          <div className="grid gap-2">
            <Label>Modelo de Transcripción</Label>
            <div className="flex gap-2">
              <Select value={transcriptionModel} onValueChange={setTranscriptionModel}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar modelo" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {TRANSCRIPTION_MODELS.map(model => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => handleSave('voice_transcription_model', transcriptionModel, 'Modelo de transcripción')}
                disabled={saving === 'voice_transcription_model'}
                size="icon"
              >
                {saving === 'voice_transcription_model' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <code className="bg-muted px-1 rounded">voice_transcription_model</code>
            </p>
          </div>

          <Separator />

          {/* Idioma */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Languages className="w-4 h-4" />
              Idioma de Transcripción
            </Label>
            <div className="flex gap-2">
              <Select value={transcriptionLanguage} onValueChange={setTranscriptionLanguage}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar idioma" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => handleSave('voice_transcription_language', transcriptionLanguage, 'Idioma de transcripción')}
                disabled={saving === 'voice_transcription_language'}
                size="icon"
              >
                {saving === 'voice_transcription_language' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <code className="bg-muted px-1 rounded">voice_transcription_language</code>
            </p>
          </div>

          <Separator />

          {/* Prompt de Transcripción */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Prompt Contextual
            </Label>
            <p className="text-xs text-muted-foreground mb-1">
              Palabras clave y contexto para mejorar la precisión de la transcripción
            </p>
            <div className="flex gap-2">
              <Textarea
                value={transcriptionPrompt}
                onChange={(e) => setTranscriptionPrompt(e.target.value)}
                className="flex-1 min-h-[100px]"
                placeholder="Ej: Transcripción de audio legal en español colombiano. Incluye términos jurídicos como demanda, tutela, sentencia..."
              />
              <Button
                onClick={() => handleSave('voice_transcription_prompt', transcriptionPrompt, 'Prompt de transcripción')}
                disabled={saving === 'voice_transcription_prompt'}
                size="icon"
                className="h-auto"
              >
                {saving === 'voice_transcription_prompt' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <code className="bg-muted px-1 rounded">voice_transcription_prompt</code>
            </p>
          </div>

          <Separator />

          {/* Tamaño máximo de audio */}
          <div className="grid gap-2">
            <Label>Tamaño Máximo de Audio (MB)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                max="100"
                value={maxAudioSize}
                onChange={(e) => setMaxAudioSize(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => handleSave('voice_max_audio_size_mb', maxAudioSize, 'Tamaño máximo de audio')}
                disabled={saving === 'voice_max_audio_size_mb'}
                size="icon"
              >
                {saving === 'voice_max_audio_size_mb' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <code className="bg-muted px-1 rounded">voice_max_audio_size_mb</code> • Límite de OpenAI: 25 MB
            </p>
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
          {/* Modelo TTS */}
          <div className="grid gap-2">
            <Label>Modelo de Síntesis</Label>
            <div className="flex gap-2">
              <Select value={ttsModel} onValueChange={setTtsModel}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar modelo" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {TTS_MODELS.map(model => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => handleSave('voice_tts_model', ttsModel, 'Modelo TTS')}
                disabled={saving === 'voice_tts_model'}
                size="icon"
              >
                {saving === 'voice_tts_model' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <code className="bg-muted px-1 rounded">voice_tts_model</code> • HD tiene mejor calidad pero es más lento
            </p>
          </div>

          <Separator />

          {/* Voz TTS */}
          <div className="grid gap-2">
            <Label>Tipo de Voz</Label>
            <div className="flex gap-2">
              <Select value={ttsVoice} onValueChange={setTtsVoice}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar voz" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {TTS_VOICES.map(voice => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => handleSave('voice_tts_voice', ttsVoice, 'Voz TTS')}
                disabled={saving === 'voice_tts_voice'}
                size="icon"
              >
                {saving === 'voice_tts_voice' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <code className="bg-muted px-1 rounded">voice_tts_voice</code>
            </p>
          </div>

          <Separator />

          {/* Caracteres máximos para TTS */}
          <div className="grid gap-2">
            <Label>Caracteres Máximos para TTS</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="100"
                max="10000"
                value={maxTextChars}
                onChange={(e) => setMaxTextChars(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => handleSave('voice_max_text_chars', maxTextChars, 'Caracteres máximos TTS')}
                disabled={saving === 'voice_max_text_chars'}
                size="icon"
              >
                {saving === 'voice_max_text_chars' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <code className="bg-muted px-1 rounded">voice_max_text_chars</code> • Límite de texto a convertir en audio
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
