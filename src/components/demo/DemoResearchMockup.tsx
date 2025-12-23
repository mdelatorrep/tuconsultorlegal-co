import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, Hourglass, Clock, BookOpen, Search, ChevronDown, FileText, Scale, RefreshCw, CheckCircle } from "lucide-react";

export default function DemoResearchMockup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8">
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-2xl">
                <Sparkles className="h-10 w-10 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Centro de Investigación Legal
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Acceso instantáneo a jurisprudencia, doctrina y normativa colombiana con análisis IA
                </p>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Target className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-primary">847</p>
                    <p className="text-sm text-muted-foreground">Investigaciones completadas</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Hourglass className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-orange-600">3</p>
                    <p className="text-sm text-muted-foreground">En progreso</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">5-30</p>
                    <p className="text-sm text-muted-foreground">Minutos promedio</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">95%</p>
                    <p className="text-sm text-muted-foreground">Precisión IA</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Interface */}
        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                <BookOpen className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">Nueva Consulta de Investigación</CardTitle>
                <CardDescription className="text-base mt-2">
                  Realiza consultas avanzadas sobre legislación, jurisprudencia o normativa colombiana
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Descripción de la consulta jurídica</label>
              <div className="min-h-[100px] p-3 border rounded-lg bg-muted/30 text-muted-foreground">
                Analiza la línea jurisprudencial más reciente de la Corte Suprema sobre terminación anticipada de contratos de arrendamiento comercial...
              </div>
            </div>
            
            <Button className="w-full h-12 bg-gradient-to-r from-primary to-primary/80" size="lg">
              <Search className="h-5 w-5 mr-2" />
              Iniciar Investigación Legal
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Investigaciones Recientes
            </h3>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
          
          {/* Completed Research */}
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-emerald-100 text-emerald-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completada
                    </Badge>
                    <Badge variant="outline">Civil</Badge>
                  </div>
                  <CardTitle className="text-lg">Precedentes sobre contratos de arrendamiento</CardTitle>
                  <CardDescription className="mt-1">
                    Consulta realizada hace 2 horas | 15 precedentes encontrados
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-lg border border-emerald-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <FileText className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-emerald-800">Resumen del análisis</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Corte Suprema de Justicia | Sala Civil | 15 sentencias analizadas
                      </p>
                      <p className="text-sm mt-2">
                        La Corte Suprema de Justicia ha establecido que en casos de fuerza mayor, el arrendatario puede solicitar la terminación anticipada del contrato de arrendamiento comercial...
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>15 precedentes encontrados</span>
                  </div>
                  <Button size="sm">
                    Ver análisis completo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* In Progress Research */}
          <Card className="border-orange-200 bg-orange-50/30">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-orange-100 text-orange-800">
                      <Hourglass className="h-3 w-3 mr-1" />
                      En progreso
                    </Badge>
                    <Badge variant="outline">Laboral</Badge>
                  </div>
                  <CardTitle className="text-lg">Jurisprudencia sobre despido sin justa causa</CardTitle>
                  <CardDescription className="mt-1">
                    Iniciada hace 15 minutos | Analizando fuentes...
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Tiempo estimado: 10-20 minutos</span>
                  <span>•</span>
                  <span>Progreso: 45%</span>
                </div>
                <Button variant="outline" size="sm">
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Ver detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
