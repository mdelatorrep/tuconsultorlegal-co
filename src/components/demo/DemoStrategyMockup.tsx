import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Calendar, CheckCircle, AlertCircle, Clock } from "lucide-react";

export default function DemoStrategyMockup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-500/5 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 p-8">
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-2xl">
                <Target className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 bg-clip-text text-transparent">
                  Análisis Estratégico de Casos
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Planificación predictiva y estrategia legal basada en inteligencia artificial
                </p>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Target className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-purple-600">89%</p>
                    <p className="text-sm text-muted-foreground">Tasa de éxito</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">234</p>
                    <p className="text-sm text-muted-foreground">Estrategias creadas</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">12 días</p>
                    <p className="text-sm text-muted-foreground">Tiempo promedio</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Case Overview */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Panorama del Caso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Tipo de Caso:</span>
                  <Badge>Litigio Comercial</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Probabilidad de Éxito:</span>
                  <Badge className="bg-emerald-100 text-emerald-800">85%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Complejidad:</span>
                  <Badge variant="secondary">Alta</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Duración Estimada:</span>
                  <span className="text-sm text-muted-foreground">8-12 meses</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Análisis Predictivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                  <span className="text-sm font-medium">85%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Basado en 342 casos similares analizados en los últimos 5 años
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Cronograma Estratégico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="w-px h-full bg-border mt-2"></div>
                </div>
                <div className="flex-1 pb-8">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold">Fase 1: Preparación y Recolección</h4>
                    <Badge variant="outline">Completada</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Recopilación de evidencias y documentación relevante
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="w-px h-full bg-border mt-2"></div>
                </div>
                <div className="flex-1 pb-8">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold">Fase 2: Presentación de Demanda</h4>
                    <Badge className="bg-blue-100 text-blue-800">En Progreso</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Redacción y presentación formal ante autoridad competente
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold">Fase 3: Etapa Probatoria</h4>
                    <Badge variant="secondary">Pendiente</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Presentación y contradicción de pruebas
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Recomendaciones Estratégicas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Fortalecer argumentación con precedentes</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Se identificaron 8 sentencias favorables que respaldan la posición del cliente
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Considerar mediación previa</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    El análisis sugiere 65% de probabilidad de acuerdo favorable en mediación
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
