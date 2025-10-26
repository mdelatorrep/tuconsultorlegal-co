import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, Hourglass, Clock, BookOpen, Search, ChevronDown, FileText, Scale } from "lucide-react";

export default function DemoResearchMockup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8">
          <div className="relative z-10">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
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
            <div className="space-y-3">
              <label className="text-sm font-semibold text-primary">
                Descripción de la consulta jurídica
              </label>
              <div className="min-h-[120px] p-4 border border-primary/20 rounded-xl bg-white text-muted-foreground">
                Analiza la línea jurisprudencial más reciente de la Corte Suprema sobre terminación anticipada de contratos de arrendamiento comercial...
              </div>
            </div>
            
            <Button className="w-full h-14" size="lg">
              <Search className="h-5 w-5 mr-2" />
              Iniciar Investigación Legal
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Investigaciones Recientes</h3>
          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scale className="h-5 w-5 text-primary" />
                    Precedentes sobre contratos de arrendamiento
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Consulta realizada hace 2 horas
                  </CardDescription>
                </div>
                <Badge className="bg-success/20 text-success border-success/30">Completada</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">15 precedentes encontrados</span>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    La Corte Suprema de Justicia ha establecido que en casos de fuerza mayor, el arrendatario puede solicitar la terminación anticipada del contrato de arrendamiento comercial...
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Ver análisis completo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
