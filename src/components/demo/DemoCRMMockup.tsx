import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Briefcase, MessageSquare, Calendar, Phone, Mail, Building, User, Plus } from "lucide-react";

export default function DemoCRMMockup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-500/5 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 p-8">
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-2xl">
                <Users className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">
                  Centro de Gestión de Clientes
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Organiza, comunica y administra la relación con tus clientes de manera profesional
                </p>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">156</p>
                    <p className="text-sm text-muted-foreground">Clientes activos</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">42</p>
                    <p className="text-sm text-muted-foreground">Casos en progreso</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-purple-600">1,234</p>
                    <p className="text-sm text-muted-foreground">Comunicaciones</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Calendar className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-orange-600">18</p>
                    <p className="text-sm text-muted-foreground">Tareas pendientes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Client List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Directorio de Clientes
              </CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cliente
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Client 1 */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">María González Pérez</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        maria.gonzalez@email.com
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        +57 300 123 4567
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>2 Casos Activos</Badge>
                  <Badge variant="outline">Premium</Badge>
                </div>
              </div>

              {/* Client 2 */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Building className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Tech Solutions SAS</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        contacto@techsolutions.co
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        +57 301 987 6543
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>5 Casos Activos</Badge>
                  <Badge variant="outline">Corporativo</Badge>
                </div>
              </div>

              {/* Client 3 */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Carlos Ruiz Martínez</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        carlos.ruiz@email.com
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        +57 315 456 7890
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>1 Caso Activo</Badge>
                  <Badge variant="outline">Particular</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Cases */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Casos Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Demanda Laboral</h4>
                    <Badge className="bg-blue-100 text-blue-800">En Progreso</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Cliente: María González</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Contrato Comercial</h4>
                    <Badge className="bg-emerald-100 text-emerald-800">Activo</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Cliente: Tech Solutions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Próximas Actividades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Audiencia Conciliación</h4>
                    <span className="text-xs text-muted-foreground">Hoy, 3:00 PM</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Caso: Demanda Laboral</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Revisión Contrato</h4>
                    <span className="text-xs text-muted-foreground">Mañana, 10:00 AM</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Cliente: Tech Solutions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
