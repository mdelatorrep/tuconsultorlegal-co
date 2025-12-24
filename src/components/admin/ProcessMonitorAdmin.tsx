import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  Scale, Activity, RefreshCw, AlertCircle, CheckCircle,
  Clock, Calendar, Eye, TrendingUp
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface MonitoredProcess {
  id: string;
  lawyer_id: string;
  lawyer_name?: string;
  radicado: string;
  tipo_proceso: string;
  despacho: string;
  estado: string;
  ultima_actualizacion: string | null;
  created_at: string;
}

export const ProcessMonitorAdmin = () => {
  const [processes, setProcesses] = useState<MonitoredProcess[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    active: 0,
    recentUpdates: 0,
    errored: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    setIsLoading(true);
    try {
      // Fetch monitored processes
      const { data: monitored, error } = await supabase
        .from('monitored_processes')
        .select(`
          id,
          lawyer_id,
          radicado,
          tipo_proceso,
          despacho,
          estado,
          ultima_actuacion_fecha,
          created_at,
          lawyer_profiles (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const processData: MonitoredProcess[] = (monitored || []).map((p: any) => ({
        id: p.id,
        lawyer_id: p.lawyer_id,
        radicado: p.radicado,
        tipo_proceso: p.tipo_proceso,
        despacho: p.despacho,
        estado: p.estado,
        ultima_actualizacion: p.ultima_actuacion_fecha,
        created_at: p.created_at,
        lawyer_name: p.lawyer_profiles?.full_name || 'Desconocido'
      }));

      setProcesses(processData);

      // Calculate metrics
      const total = processData.length;
      const active = processData.filter(p => p.estado === 'activo').length;
      const recentUpdates = processData.filter(p => {
        if (!p.ultima_actualizacion) return false;
        const lastUpdate = new Date(p.ultima_actualizacion);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return lastUpdate > hourAgo;
      }).length;
      const errored = processData.filter(p => p.estado === 'error').length;

      setMetrics({ total, active, recentUpdates, errored });

    } catch (error) {
      console.error('Error loading monitored processes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'activo':
        return <Badge className="bg-emerald-100 text-emerald-700">Activo</Badge>;
      case 'pausado':
        return <Badge className="bg-amber-100 text-amber-700">Pausado</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-700">Error</Badge>;
      case 'terminado':
        return <Badge className="bg-blue-100 text-blue-700">Terminado</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-6 h-6" />
            Procesos Monitoreados
          </h2>
          <p className="text-muted-foreground">
            Gestión y seguimiento de procesos judiciales
          </p>
        </div>
        <Button variant="outline" onClick={loadProcesses}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Procesos</p>
                <p className="text-3xl font-bold">{metrics.total}</p>
              </div>
              <Scale className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-3xl font-bold text-emerald-600">{metrics.active}</p>
              </div>
              <Activity className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Updates (1h)</p>
                <p className="text-3xl font-bold text-blue-600">{metrics.recentUpdates}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Con Errores</p>
                <p className="text-3xl font-bold text-red-600">{metrics.errored}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {metrics.errored > 0 && (
        <Card className="border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium">{metrics.errored} procesos con errores de sincronización</p>
                <p className="text-sm text-muted-foreground">
                  Revisa la conexión con el sistema de rama judicial o los parámetros de búsqueda.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Procesos</CardTitle>
        </CardHeader>
        <CardContent>
          {processes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Scale className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No hay procesos monitoreados</p>
              <p className="text-sm">Los abogados pueden agregar procesos desde su módulo de monitoreo.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {processes.map((process) => (
                <div key={process.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-mono text-sm font-medium">{process.radicado}</p>
                      {getStatusBadge(process.estado)}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {process.tipo_proceso} • {process.despacho}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Abogado: {process.lawyer_name}
                    </p>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Última actualización:
                    </div>
                    <p className="text-sm font-medium">
                      {process.ultima_actualizacion ? formatDistanceToNow(new Date(process.ultima_actualizacion), { 
                        addSuffix: true,
                        locale: es 
                      }) : 'Sin actualizar'}
                    </p>
                  </div>

                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
