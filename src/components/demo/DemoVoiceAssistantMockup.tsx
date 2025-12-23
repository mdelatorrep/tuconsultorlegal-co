import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, FileText, Clock, CheckCircle, Sparkles, MessageSquare, Languages, Wand2 } from "lucide-react";

export default function DemoVoiceAssistantMockup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-violet-500/5 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent border border-violet-500/20 p-8">
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl shadow-2xl">
                <Mic className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 via-violet-500 to-violet-400 bg-clip-text text-transparent">
                  Asistente de Voz Legal
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Dicta documentos, transcribe audiencias y controla la plataforma con tu voz
                </p>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-violet-600" />
                  <div>
                    <p className="text-2xl font-bold text-violet-600">1,234</p>
                    <p className="text-sm text-muted-foreground">Transcripciones realizadas</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">48h</p>
                    <p className="text-sm text-muted-foreground">Audio transcrito</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">98%</p>
                    <p className="text-sm text-muted-foreground">Precisión de transcripción</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Voice Interface */}
        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl shadow-lg">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Grabación de Voz</CardTitle>
                <CardDescription className="text-base mt-2">
                  Dicta documentos o transcribe audiencias en tiempo real
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Recording Interface */}
            <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-violet-50 to-white rounded-2xl border border-violet-100">
              <div className="relative">
                <div className="absolute inset-0 bg-violet-400/20 rounded-full animate-ping"></div>
                <div className="relative p-8 bg-gradient-to-br from-violet-500 to-violet-600 rounded-full shadow-2xl cursor-pointer hover:scale-105 transition-transform">
                  <Mic className="h-12 w-12 text-white" />
                </div>
              </div>
              <p className="mt-6 text-lg font-semibold text-violet-700">Grabando...</p>
              <p className="text-sm text-muted-foreground">00:45 | Toca para detener</p>
              
              {/* Voice Waveform Simulation */}
              <div className="flex items-center gap-1 mt-4 h-12">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-violet-400 rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 100}%`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" className="h-20 flex-col gap-2">
                <FileText className="h-6 w-6 text-violet-600" />
                <span className="text-xs">Dictar Documento</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Volume2 className="h-6 w-6 text-violet-600" />
                <span className="text-xs">Transcribir Audio</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Languages className="h-6 w-6 text-violet-600" />
                <span className="text-xs">Traducir</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <MessageSquare className="h-6 w-6 text-violet-600" />
                <span className="text-xs">Comandos de Voz</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transcriptions */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-600" />
            Transcripciones Recientes
          </h3>
          
          <Card className="border-violet-200/50 hover:border-violet-300 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-violet-100 rounded-xl">
                    <Volume2 className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-emerald-100 text-emerald-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completada
                      </Badge>
                      <Badge variant="outline">Audiencia</Badge>
                    </div>
                    <h4 className="font-semibold">Audiencia de Conciliación - Caso González</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Duración: 45 minutos | 3,456 palabras transcritas
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Hace 2 horas</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Ver transcripción
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-violet-200/50 hover:border-violet-300 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-violet-100 rounded-xl">
                    <FileText className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-emerald-100 text-emerald-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completada
                      </Badge>
                      <Badge variant="outline">Documento dictado</Badge>
                    </div>
                    <h4 className="font-semibold">Demanda de Responsabilidad Civil</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Duración: 15 minutos | 1,234 palabras transcritas
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Ayer</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Ver documento
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Enhancement */}
        <Card className="border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50/50 to-white">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="p-4 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl mx-auto w-fit">
                <Wand2 className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Mejora con IA</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  La IA puede corregir errores, formatear el texto y agregar puntuación automáticamente a tus transcripciones
                </p>
              </div>
              <Button size="lg" className="bg-gradient-to-r from-violet-500 to-violet-600">
                <Sparkles className="h-5 w-5 mr-2" />
                Mejorar Transcripción
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
