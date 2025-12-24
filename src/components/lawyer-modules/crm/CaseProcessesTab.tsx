import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Scale, 
  ExternalLink, 
  RefreshCw, 
  Clock, 
  AlertCircle,
  Loader2,
  Unlink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MonitoredProcess {
  id: string;
  radicado: string;
  despacho: string | null;
  tipo_proceso: string | null;
  demandante: string | null;
  demandado: string | null;
  estado: string | null;
  ultima_actuacion_fecha: string | null;
  ultima_actuacion_descripcion: string | null;
}

interface CaseProcessesTabProps {
  caseId: string;
  lawyerId: string;
  onRefresh: () => void;
}

const CaseProcessesTab: React.FC<CaseProcessesTabProps> = ({ caseId, lawyerId, onRefresh }) => {
  const [processes, setProcesses] = useState<MonitoredProcess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadProcesses();
  }, [caseId]);

  const loadProcesses = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('monitored_processes')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProcesses(data || []);
    } catch (error) {
      console.error('Error loading processes:', error);
      toast.error('Error al cargar procesos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async (processId: string) => {
    try {
      setSyncing(processId);
      const { error } = await supabase.functions.invoke('rama-judicial-monitor', {
        body: { action: 'sync', processId }
      });

      if (error) throw error;
      toast.success('Proceso sincronizado');
      loadProcesses();
    } catch (error) {
      console.error('Error syncing process:', error);
      toast.error('Error al sincronizar');
    } finally {
      setSyncing(null);
    }
  };

  const handleUnlink = async (processId: string) => {
    if (!confirm('¿Desvincular este proceso del caso? El proceso seguirá en tu monitor.')) return;

    try {
      const { error } = await supabase
        .from('monitored_processes')
        .update({ case_id: null })
        .eq('id', processId);

      if (error) throw error;
      toast.success('Proceso desvinculado');
      loadProcesses();
      onRefresh();
    } catch (error) {
      console.error('Error unlinking process:', error);
      toast.error('Error al desvincular');
    }
  };

  const getStatusColor = (estado: string | null) => {
    switch (estado) {
      case 'activo': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'terminado': return 'bg-muted text-muted-foreground';
      case 'suspendido': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (processes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-2">No hay procesos vinculados a este caso</p>
          <p className="text-sm text-muted-foreground">
            Usa la acción rápida "Vincular Proceso" para agregar procesos judiciales
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Procesos Judiciales Vinculados
        </CardTitle>
        <CardDescription>
          {processes.length} proceso(s) vinculado(s) a este caso
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {processes.map((process) => (
              <div 
                key={process.id} 
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-mono font-medium">{process.radicado}</p>
                      <Badge variant="outline" className={getStatusColor(process.estado)}>
                        {process.estado || 'Desconocido'}
                      </Badge>
                    </div>
                    
                    {process.despacho && (
                      <p className="text-sm text-muted-foreground mb-2">{process.despacho}</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {process.demandante && (
                        <div>
                          <span className="text-muted-foreground">Demandante: </span>
                          <span>{process.demandante}</span>
                        </div>
                      )}
                      {process.demandado && (
                        <div>
                          <span className="text-muted-foreground">Demandado: </span>
                          <span>{process.demandado}</span>
                        </div>
                      )}
                    </div>

                    {process.ultima_actuacion_fecha && (
                      <div className="mt-3 p-2 rounded bg-muted/50 border-l-2 border-primary">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Clock className="h-3 w-3" />
                          Última actuación: {format(new Date(process.ultima_actuacion_fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </div>
                        {process.ultima_actuacion_descripcion && (
                          <p className="text-sm">{process.ultima_actuacion_descripcion}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(process.id)}
                      disabled={syncing === process.id}
                    >
                      {syncing === process.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={`https://consultaprocesos.ramajudicial.gov.co/procesos/buscador?radicado=${process.radicado}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleUnlink(process.id)}
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CaseProcessesTab;
