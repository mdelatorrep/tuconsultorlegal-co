import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Activity, RefreshCw, Loader2, Shield, AlertCircle, 
  CheckCircle, Clock, XCircle, Server, Search, Database
} from "lucide-react";

interface ResearchTask {
  id: string;
  lawyer_id: string;
  query: string;
  status: string;
  retry_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  last_error: string | null;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  user_identifier: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
}

interface ServiceStatus {
  id: string;
  service_name: string;
  status: string;
  last_checked: string;
  response_time_ms: number | null;
  error_message: string | null;
}

export const SystemMonitoring = () => {
  const [researchTasks, setResearchTasks] = useState<ResearchTask[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    pendingResearch: 0,
    failedResearch: 0,
    securityEventsToday: 0,
    servicesHealthy: 0,
    servicesDown: 0
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadResearchQueue(),
        loadSecurityEvents(),
        loadServiceStatus()
      ]);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadResearchQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('research_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setResearchTasks(data || []);
      
      const tasks = data || [];
      setStats(prev => ({
        ...prev,
        pendingResearch: tasks.filter(t => t.status === 'pending' || t.status === 'processing').length,
        failedResearch: tasks.filter(t => t.status === 'failed').length
      }));
    } catch (error) {
      console.error('Error loading research queue:', error);
    }
  };

  const loadSecurityEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSecurityEvents(data || []);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventsToday = (data || []).filter(e => new Date(e.created_at) >= today).length;
      
      setStats(prev => ({
        ...prev,
        securityEventsToday: eventsToday
      }));
    } catch (error) {
      console.error('Error loading security events:', error);
    }
  };

  const loadServiceStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('service_status')
        .select('*')
        .order('last_check', { ascending: false });

      if (error) throw error;
      setServiceStatus(data || []);
      
      const services = data || [];
      setStats(prev => ({
        ...prev,
        servicesHealthy: services.filter(s => s.status === 'healthy').length,
        servicesDown: services.filter(s => s.status === 'down' || s.status === 'error').length
      }));
    } catch (error) {
      console.error('Error loading service status:', error);
    }
  };

  const getResearchStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; className: string; label: string }> = {
      'pending': { icon: Clock, className: 'bg-yellow-100 text-yellow-800', label: 'Pendiente' },
      'processing': { icon: Loader2, className: 'bg-blue-100 text-blue-800', label: 'Procesando' },
      'completed': { icon: CheckCircle, className: 'bg-green-100 text-green-800', label: 'Completado' },
      'failed': { icon: XCircle, className: 'bg-red-100 text-red-800', label: 'Fallido' },
      'rate_limited': { icon: AlertCircle, className: 'bg-orange-100 text-orange-800', label: 'Rate Limited' }
    };
    const c = config[status] || { icon: Clock, className: 'bg-gray-100 text-gray-800', label: status };
    const Icon = c.icon;
    return (
      <Badge className={c.className}>
        <Icon className="w-3 h-3 mr-1" />
        {c.label}
      </Badge>
    );
  };

  const getServiceStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      'healthy': { className: 'bg-green-100 text-green-800', label: 'Saludable' },
      'degraded': { className: 'bg-yellow-100 text-yellow-800', label: 'Degradado' },
      'down': { className: 'bg-red-100 text-red-800', label: 'Caído' },
      'error': { className: 'bg-red-100 text-red-800', label: 'Error' }
    };
    const c = config[status] || { className: 'bg-gray-100 text-gray-800', label: status };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const getEventTypeBadge = (eventType: string) => {
    const isWarning = eventType.includes('failed') || eventType.includes('error') || eventType.includes('locked');
    return (
      <Badge variant={isWarning ? "destructive" : "outline"}>
        {eventType}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Investigaciones Pendientes</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.pendingResearch}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Investigaciones Fallidas</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.failedResearch}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Eventos Hoy</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.securityEventsToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Servicios OK</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.servicesHealthy}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Servicios Caídos</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.servicesDown}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="research">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="research">
              <Search className="w-4 h-4 mr-2" />
              Cola de Investigación
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Eventos de Seguridad
            </TabsTrigger>
            <TabsTrigger value="services">
              <Server className="w-4 h-4 mr-2" />
              Estado de Servicios
            </TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={loadAllData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>

        <TabsContent value="research">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Cola de Investigación Legal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Reintentos</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {researchTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="max-w-[300px] truncate">{task.query}</TableCell>
                      <TableCell>{getResearchStatusBadge(task.status)}</TableCell>
                      <TableCell>{task.retry_count}</TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(task.created_at), "dd/MM HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-red-500">
                        {task.last_error || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {researchTasks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No hay tareas de investigación
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Eventos de Seguridad Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Detalles</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{getEventTypeBadge(event.event_type)}</TableCell>
                      <TableCell className="text-xs">{event.user_identifier || '-'}</TableCell>
                      <TableCell className="text-xs font-mono">{event.ip_address || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">
                        {event.details ? JSON.stringify(event.details).substring(0, 50) : '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(event.created_at), "dd/MM HH:mm:ss", { locale: es })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {securityEvents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No hay eventos de seguridad
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Estado de Servicios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Tiempo Respuesta</TableHead>
                    <TableHead>Última Verificación</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceStatus.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.service_name}</TableCell>
                      <TableCell>{getServiceStatusBadge(service.status)}</TableCell>
                      <TableCell>
                        {service.response_time_ms ? `${service.response_time_ms}ms` : '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(service.last_checked), "dd/MM HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-red-500">
                        {service.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {serviceStatus.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No hay datos de estado de servicios
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
