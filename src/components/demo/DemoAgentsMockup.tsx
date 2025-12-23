import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, Zap, Target, TrendingUp, Settings, Plus, Scale, Briefcase, FileText, Trophy, Star, Award, Flame, Medal, Gift } from "lucide-react";

export default function DemoAgentsMockup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-pink-500/5 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-500/10 via-pink-500/5 to-transparent border border-pink-500/20 p-8">
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-2xl">
                <Bot className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 via-pink-500 to-pink-400 bg-clip-text text-transparent">
                  Agentes IA + Gamificación
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Asistentes personalizados con sistema de logros y recompensas
                </p>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Bot className="h-8 w-8 text-pink-600" />
                  <div>
                    <p className="text-2xl font-bold text-pink-600">12</p>
                    <p className="text-sm text-muted-foreground">Agentes activos</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">94%</p>
                    <p className="text-sm text-muted-foreground">Precisión promedio</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-amber-600" />
                  <div>
                    <p className="text-2xl font-bold text-amber-600">15</p>
                    <p className="text-sm text-muted-foreground">Logros desbloqueados</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Zap className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-orange-600">8.2K</p>
                    <p className="text-sm text-muted-foreground">Consultas procesadas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gamification Section */}
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-white">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  Sistema de Gamificación
                  <Badge className="bg-amber-100 text-amber-800">
                    <Flame className="h-3 w-3 mr-1" />
                    Racha de 7 días
                  </Badge>
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-white rounded-xl border border-amber-200 text-center">
                <div className="p-3 bg-amber-100 rounded-full w-fit mx-auto mb-2">
                  <Star className="h-6 w-6 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-amber-600">2,450</div>
                <p className="text-sm text-muted-foreground">Puntos XP</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-amber-200 text-center">
                <div className="p-3 bg-emerald-100 rounded-full w-fit mx-auto mb-2">
                  <Award className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-600">Nivel 8</div>
                <p className="text-sm text-muted-foreground">Abogado Experto</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-amber-200 text-center">
                <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-2">
                  <Medal className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600">15</div>
                <p className="text-sm text-muted-foreground">Logros</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-amber-200 text-center">
                <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-2">
                  <Gift className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-600">500</div>
                <p className="text-sm text-muted-foreground">Créditos ganados</p>
              </div>
            </div>
            
            {/* Achievement Badges */}
            <div className="p-4 bg-gradient-to-r from-amber-50 to-white rounded-xl border border-amber-200">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-600" />
                Logros Recientes
              </h4>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 py-1.5 px-3">
                  <Award className="h-3 w-3 mr-1" />
                  Primer Documento
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 py-1.5 px-3">
                  <Flame className="h-3 w-3 mr-1" />
                  Racha de 7 días
                </Badge>
                <Badge className="bg-purple-100 text-purple-800 py-1.5 px-3">
                  <Bot className="h-3 w-3 mr-1" />
                  Primer Agente Creado
                </Badge>
                <Badge className="bg-amber-100 text-amber-800 py-1.5 px-3">
                  <Star className="h-3 w-3 mr-1" />
                  100 Consultas
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agent Gallery */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Tus Agentes Especializados</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Nuevo Agente
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Agent 1 - Derecho Laboral */}
            <Card className="border-2 hover:border-pink-300 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl">
                    <Scale className="h-6 w-6 text-white" />
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800">Activo</Badge>
                </div>
                <CardTitle className="mt-4">Asistente Derecho Laboral</CardTitle>
                <CardDescription>
                  Especializado en contratación, despidos y litigios laborales en Colombia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Consultas:</span>
                    <span className="font-semibold">2,345</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Precisión:</span>
                    <Badge variant="outline" className="bg-emerald-50">96%</Badge>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="h-3 w-3 mr-1" />
                      Configurar
                    </Button>
                    <Button size="sm" className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Consultar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agent 2 - Contratos */}
            <Card className="border-2 hover:border-pink-300 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800">Activo</Badge>
                </div>
                <CardTitle className="mt-4">Experto en Contratos</CardTitle>
                <CardDescription>
                  Revisión y redacción de contratos comerciales, civiles y mercantiles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Consultas:</span>
                    <span className="font-semibold">1,892</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Precisión:</span>
                    <Badge variant="outline" className="bg-emerald-50">93%</Badge>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="h-3 w-3 mr-1" />
                      Configurar
                    </Button>
                    <Button size="sm" className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Consultar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agent 3 - Litigios */}
            <Card className="border-2 hover:border-pink-300 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800">Activo</Badge>
                </div>
                <CardTitle className="mt-4">Estratega de Litigios</CardTitle>
                <CardDescription>
                  Análisis estratégico y planificación de casos complejos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Consultas:</span>
                    <span className="font-semibold">987</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Precisión:</span>
                    <Badge variant="outline" className="bg-emerald-50">91%</Badge>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="h-3 w-3 mr-1" />
                      Configurar
                    </Button>
                    <Button size="sm" className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Consultar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Create New Agent */}
        <Card className="border-2 border-dashed border-pink-200 bg-gradient-to-br from-pink-50/50 to-white">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="p-4 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl mx-auto w-fit">
                <Plus className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Crea tu Propio Agente Especializado</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Diseña un asistente IA personalizado y gana XP por cada consulta exitosa
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <Badge className="bg-amber-100 text-amber-800">+50 XP por crear</Badge>
                <Badge className="bg-emerald-100 text-emerald-800">+5 XP por consulta</Badge>
              </div>
              <Button size="lg" className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-500">
                <Sparkles className="h-5 w-5 mr-2" />
                Comenzar Ahora
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
