import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, AlertTriangle, CheckCircle, Bell, Calculator, Gavel, FileText, Plus } from "lucide-react";

export default function DemoCalendarMockup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-indigo-500/5 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-500/20 p-8">
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-2xl">
                <Calendar className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
                  Calendario Legal Inteligente
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Gestión de términos, audiencias y vencimientos con cálculo automático de días hábiles
                </p>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-indigo-600" />
                  <div>
                    <p className="text-2xl font-bold text-indigo-600">23</p>
                    <p className="text-sm text-muted-foreground">Términos activos</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">3</p>
                    <p className="text-sm text-muted-foreground">Vencen esta semana</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Gavel className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-purple-600">8</p>
                    <p className="text-sm text-muted-foreground">Audiencias programadas</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">156</p>
                    <p className="text-sm text-muted-foreground">Términos cumplidos</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deadline Calculator */}
        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Calculadora de Términos</CardTitle>
                <CardDescription className="text-base mt-2">
                  Calcula fechas de vencimiento considerando días hábiles y festivos colombianos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Fecha de Inicio</label>
                <div className="p-3 border rounded-lg bg-muted/30">
                  23 de diciembre de 2024
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de Término</label>
                <div className="p-3 border rounded-lg bg-muted/30">
                  Días hábiles
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Cantidad de Días</label>
                <div className="p-3 border rounded-lg bg-muted/30">
                  10 días
                </div>
              </div>
            </div>
            
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-indigo-900">Fecha de Vencimiento Calculada</h4>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">8 de enero de 2025</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Se excluyeron 4 días festivos (Navidad, Año Nuevo, Reyes)
                  </p>
                </div>
                <Button className="bg-gradient-to-r from-indigo-500 to-indigo-600">
                  <Bell className="h-4 w-4 mr-2" />
                  Crear Recordatorio
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              Próximos Vencimientos
            </h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Término
            </Button>
          </div>
          
          {/* Urgent Deadline */}
          <Card className="border-red-200 bg-red-50/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-xl">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="destructive">Vence mañana</Badge>
                      <Badge variant="outline">Proceso 110013</Badge>
                    </div>
                    <h4 className="font-semibold">Contestación de demanda</h4>
                    <p className="text-sm text-muted-foreground">
                      Caso: González vs. Tech Solutions | Cliente: María González
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">1 día</p>
                  <p className="text-sm text-muted-foreground">24 dic 2024</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Normal Deadline */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <FileText className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-amber-100 text-amber-800">Esta semana</Badge>
                      <Badge variant="outline">Proceso 110025</Badge>
                    </div>
                    <h4 className="font-semibold">Alegatos de conclusión</h4>
                    <p className="text-sm text-muted-foreground">
                      Caso: Demanda Laboral | Cliente: Carlos Ruiz
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-600">5 días</p>
                  <p className="text-sm text-muted-foreground">28 dic 2024</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hearing */}
          <Card className="border-purple-200 bg-purple-50/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <Gavel className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-purple-100 text-purple-800">Audiencia</Badge>
                      <Badge variant="outline">Proceso 110038</Badge>
                    </div>
                    <h4 className="font-semibold">Audiencia de conciliación</h4>
                    <p className="text-sm text-muted-foreground">
                      Juzgado 5 Laboral | 10:00 AM | Presencial
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600">8 días</p>
                  <p className="text-sm text-muted-foreground">2 ene 2025</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
