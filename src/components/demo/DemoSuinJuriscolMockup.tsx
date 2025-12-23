import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, Search, BookOpen, Scale, FileText, ExternalLink, Filter, CheckCircle } from "lucide-react";

export default function DemoSuinJuriscolMockup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-teal-500/5 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent border border-teal-500/20 p-8">
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-2xl">
                <Database className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400 bg-clip-text text-transparent">
                  SUIN-Juriscol
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Búsqueda avanzada en el Sistema Único de Información Normativa colombiano
                </p>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Database className="h-8 w-8 text-teal-600" />
                  <div>
                    <p className="text-2xl font-bold text-teal-600">1M+</p>
                    <p className="text-sm text-muted-foreground">Normas indexadas</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Scale className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">50K+</p>
                    <p className="text-sm text-muted-foreground">Sentencias disponibles</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">24/7</p>
                    <p className="text-sm text-muted-foreground">Actualización continua</p>
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
              <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-lg">
                <Search className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Búsqueda Normativa</CardTitle>
                <CardDescription className="text-base mt-2">
                  Consulta leyes, decretos, resoluciones y conceptos jurídicos de Colombia
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="cursor-pointer hover:bg-teal-50">Leyes</Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-teal-50">Decretos</Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-teal-50">Resoluciones</Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-teal-50">Conceptos</Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-teal-50">Sentencias</Badge>
            </div>
            
            <div className="min-h-[80px] p-4 border rounded-xl bg-muted/30 text-muted-foreground">
              Ley 1801 de 2016 Código de Policía convivencia ciudadana...
            </div>
            
            <div className="flex gap-2">
              <Button className="flex-1 h-12 bg-gradient-to-r from-teal-500 to-teal-600" size="lg">
                <Search className="h-5 w-5 mr-2" />
                Buscar en SUIN-Juriscol
              </Button>
              <Button variant="outline" size="lg">
                <Filter className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-teal-600" />
            Resultados (15 normas encontradas)
          </h3>
          
          <Card className="border-teal-200/50 hover:border-teal-300 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-teal-100 text-teal-800">Ley</Badge>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Vigente</Badge>
                  </div>
                  <CardTitle className="text-lg">Ley 1801 de 2016</CardTitle>
                  <CardDescription className="mt-1">
                    Por la cual se expide el Código Nacional de Seguridad y Convivencia Ciudadana
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-teal-50/50 p-4 rounded-lg border border-teal-100">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Artículo 1.</span> Objeto. Las disposiciones previstas en este Código son de carácter preventivo y buscan establecer las condiciones para la convivencia en el territorio nacional...
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Publicada: 29/07/2016</span>
                    <span>•</span>
                    <span>243 artículos</span>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver completa
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-teal-200/50 hover:border-teal-300 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-100 text-blue-800">Decreto</Badge>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Vigente</Badge>
                  </div>
                  <CardTitle className="text-lg">Decreto 1070 de 2015</CardTitle>
                  <CardDescription className="mt-1">
                    Por el cual se expide el Decreto Único Reglamentario del Sector Administrativo del Interior
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Publicada: 26/05/2015</span>
                  <span>•</span>
                  <span>Compilado</span>
                </div>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver completa
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
