import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gavel, Search, Bell, Clock, AlertTriangle, CheckCircle, Eye, Calendar, RefreshCw, FileText } from "lucide-react";

export default function DemoProcessMonitorMockup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/5 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-8">
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-2xl">
                <Gavel className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 bg-clip-text text-transparent">
                  Monitor de Procesos Judiciales
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Consulta y monitorea procesos en la Rama Judicial con alertas automáticas
                </p>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Eye className="h-8 w-8 text-amber-600" />
                  <div>
                    <p className="text-2xl font-bold text-amber-600">48</p>
                    <p className="text-sm text-muted-foreground">Procesos monitoreados</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Bell className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">5</p>
                    <p className="text-sm text-muted-foreground">Alertas activas</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">12h</p>
                    <p className="text-sm text-muted-foreground">Última actualización</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">156</p>
                    <p className="text-sm text-muted-foreground">Movimientos detectados</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Process */}
        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg">
                <Search className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Consultar Proceso</CardTitle>
                <CardDescription className="text-base mt-2">
                  Ingresa el número de radicado para consultar el estado del proceso
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Número de Radicado</label>
                <div className="p-3 border rounded-lg bg-muted/30">
                  11001310500320210012300
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Despacho (opcional)</label>
                <div className="p-3 border rounded-lg bg-muted/30 text-muted-foreground">
                  Juzgado 3 Civil del Circuito
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-amber-600" size="lg">
                <Search className="h-5 w-5 mr-2" />
                Consultar Proceso
              </Button>
              <Button variant="outline" size="lg">
                <Bell className="h-5 w-5 mr-2" />
                Activar Monitoreo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Monitored Processes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-600" />
              Procesos Monitoreados
            </h3>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar todos
            </Button>
          </div>
          
          {/* Process with Alert */}
          <Card className="border-red-200 bg-red-50/30">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-red-100 text-red-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Nueva Actuación
                    </Badge>
                    <Badge variant="outline">Civil</Badge>
                  </div>
                  <CardTitle className="text-lg">Proceso 11001310500320210012300</CardTitle>
                  <CardDescription className="mt-1">
                    Demanda Ejecutiva | María González vs. Tech Solutions SAS
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-lg border border-red-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <FileText className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-800">Auto que ordena notificación</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Fecha: Hace 2 horas | Despacho: Juzgado 3 Civil del Circuito
                      </p>
                      <p className="text-sm mt-2">
                        Se ordena la notificación personal al demandado en la dirección indicada...
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Próximo término: 15 días hábiles</span>
                  </div>
                  <Button size="sm">
                    Ver detalles completos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Process Normal */}
          <Card className="border-border hover:border-amber-300 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-emerald-100 text-emerald-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Sin novedades
                    </Badge>
                    <Badge variant="outline">Laboral</Badge>
                  </div>
                  <CardTitle className="text-lg">Proceso 11001310502120200045600</CardTitle>
                  <CardDescription className="mt-1">
                    Demanda Laboral | Carlos Ruiz vs. Empresa XYZ
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Última actuación: hace 5 días</span>
                  <span>•</span>
                  <span>Estado: En trámite</span>
                </div>
                <Button variant="outline" size="sm">
                  Ver historial
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
