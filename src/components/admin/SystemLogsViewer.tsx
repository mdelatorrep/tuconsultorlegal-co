import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, AlertCircle, Info, AlertTriangle, Clock, Database, Shield, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LogEntry {
  id: string;
  timestamp: string;
  event_message: string;
  level: string;
  details?: Record<string, any>;
  ip_address?: string;
}

type LogType = 'edge_functions' | 'security' | 'system';

export function SystemLogsViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<LogType>('edge_functions');

  const fetchLogs = async (logType: LogType) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-system-logs', {
        body: { log_type: logType, limit: 100 }
      });

      if (error) throw error;
      setLogs(data.logs || []);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      toast.error('Error al cargar logs');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as LogType);
    fetchLogs(value as LogType);
  };

  const getLevelBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Error</Badge>;
      case 'warn':
      case 'warning':
        return <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600"><AlertTriangle className="h-3 w-3" /> Warning</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Info className="h-3 w-3" /> Info</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Logs del Sistema</h2>
          <p className="text-muted-foreground text-sm">
            Monitoreo de actividad y errores en tiempo real
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => fetchLogs(activeTab)}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="edge_functions" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Edge Functions</span>
            <span className="sm:hidden">Functions</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Seguridad</span>
            <span className="sm:hidden">Seguridad</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Sistema</span>
            <span className="sm:hidden">Sistema</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Últimos {logs.length} registros
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 && !loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Haz clic en "Actualizar" para cargar los logs</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getLevelBadge(log.level)}
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(log.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm font-mono break-all">
                              {log.event_message}
                            </p>
                            {log.details && Object.keys(log.details).length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                  Ver detalles
                                </summary>
                                <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </details>
                            )}
                            {log.ip_address && (
                              <span className="text-xs text-muted-foreground">
                                IP: {log.ip_address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
