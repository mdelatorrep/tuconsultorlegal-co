import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Plus, 
  RefreshCw, 
  Bell, 
  FileText, 
  Calendar,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Coins
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCredits } from '@/hooks/useCredits';
import { ToolCostIndicator } from '@/components/credits/ToolCostIndicator';

interface MonitoredProcess {
  id: string;
  radicado: string;
  despacho: string | null;
  tipo_proceso: string;
  demandante: string | null;
  demandado: string | null;
  estado: string;
  ultima_actuacion_fecha: string | null;
  ultima_actuacion_descripcion: string | null;
  notificaciones_activas: boolean;
}

interface Actuation {
  id: string;
  fecha_actuacion: string;
  actuacion: string;
  anotacion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  is_new: boolean;
}

interface ProcessMonitorModuleProps {
  lawyerId: string;
}

export function ProcessMonitorModule({ lawyerId }: ProcessMonitorModuleProps) {
  const [processes, setProcesses] = useState<MonitoredProcess[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<MonitoredProcess | null>(null);
  const [actuations, setActuations] = useState<Actuation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingActuations, setLoadingActuations] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { consumeCredits, hasEnoughCredits, getToolCost } = useCredits(lawyerId);
  
  // Form state for new process
  const [newProcess, setNewProcess] = useState({
    radicado: '',
    despacho: '',
    proceso_tipo: 'civil',
    demandante: '',
    demandado: ''
  });

  useEffect(() => {
    loadProcesses();
  }, [lawyerId]);

  const loadProcesses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('monitored_processes')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .eq('notificaciones_activas', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProcesses((data || []) as MonitoredProcess[]);
      
      if (data && data.length > 0 && !selectedProcess) {
        setSelectedProcess(data[0] as MonitoredProcess);
        loadActuations(data[0].id);
      }
    } catch (error) {
      console.error('Error loading processes:', error);
      toast.error('Error al cargar procesos');
    } finally {
      setLoading(false);
    }
  };

  const loadActuations = async (processId: string) => {
    try {
      setLoadingActuations(true);
      const { data, error } = await supabase
        .from('process_actuations')
        .select('*')
        .eq('monitored_process_id', processId)
        .order('fecha_actuacion', { ascending: false });

      if (error) throw error;
      setActuations((data || []) as Actuation[]);
    } catch (error) {
      console.error('Error loading actuations:', error);
      toast.error('Error al cargar actuaciones');
    } finally {
      setLoadingActuations(false);
    }
  };

  const addProcess = async () => {
    if (!newProcess.radicado.trim()) {
      toast.error('El número de radicado es requerido');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('monitored_processes')
        .insert({
          lawyer_id: lawyerId,
          radicado: newProcess.radicado.trim(),
          despacho: newProcess.despacho.trim() || null,
          tipo_proceso: newProcess.proceso_tipo,
          demandante: newProcess.demandante.trim() || null,
          demandado: newProcess.demandado.trim() || null,
          estado: 'activo'
        })
        .select()
        .single();

      if (error) throw error;
      
      setProcesses([data as MonitoredProcess, ...processes]);
      setSelectedProcess(data as MonitoredProcess);
      setShowAddDialog(false);
      setNewProcess({ radicado: '', despacho: '', proceso_tipo: 'civil', demandante: '', demandado: '' });
      toast.success('Proceso agregado correctamente');
      
      // Sync immediately
      syncProcess(data.id);
    } catch (error: any) {
      console.error('Error adding process:', error);
      toast.error(error.message || 'Error al agregar proceso');
    }
  };

  const syncProcess = async (processId: string) => {
    // Check credits
    if (!hasEnoughCredits('process_monitor')) {
      toast.error(`Créditos insuficientes. Necesitas ${getToolCost('process_monitor')} créditos para sincronizar.`);
      return;
    }

    try {
      setSyncing(true);
      
      // Consume credits
      const creditResult = await consumeCredits('process_monitor', { action: 'sync', processId });
      if (!creditResult.success) {
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('rama-judicial-monitor', {
        body: { 
          action: 'sync',
          processId 
        }
      });

      if (error) throw error;
      
      toast.success('Proceso sincronizado');
      loadActuations(processId);
      loadProcesses();
    } catch (error) {
      console.error('Error syncing process:', error);
      toast.error('Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const syncAllProcesses = async () => {
    // Check credits - charge per process
    const processCount = processes.length;
    const totalCost = getToolCost('process_monitor') * processCount;
    
    if (!hasEnoughCredits('process_monitor')) {
      toast.error(`Créditos insuficientes. Necesitas ${totalCost} créditos para sincronizar ${processCount} procesos.`);
      return;
    }

    try {
      setSyncing(true);
      
      // Consume credits for all processes
      const creditResult = await consumeCredits('process_monitor', { action: 'sync-all', processCount });
      if (!creditResult.success) {
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('rama-judicial-monitor', {
        body: { 
          action: 'sync-all',
          lawyerId 
        }
      });

      if (error) throw error;
      
      toast.success('Todos los procesos sincronizados');
      loadProcesses();
    } catch (error) {
      console.error('Error syncing all processes:', error);
      toast.error('Error al sincronizar procesos');
    } finally {
      setSyncing(false);
    }
  };

  const filteredProcesses = processes.filter(p => 
    p.radicado.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.demandante?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.demandado?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'terminado': return 'bg-muted text-muted-foreground';
      case 'suspendido': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const canSync = hasEnoughCredits('process_monitor');

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por radicado o partes..."
            className="pl-10"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 items-center">
          <Button 
            variant="outline" 
            onClick={syncAllProcesses}
            disabled={syncing || processes.length === 0 || !canSync}
            size="sm"
          >
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                <span>Sincronizar Todo</span>
                <span className="ml-2 flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs">
                  <Coins className="h-3 w-3" />
                  {getToolCost('process_monitor')}
                </span>
              </>
            )}
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Proceso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Proceso para Monitoreo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Número de Radicado *</Label>
                  <Input 
                    placeholder="Ej: 11001310300320200012300"
                    value={newProcess.radicado}
                    onChange={e => setNewProcess({ ...newProcess, radicado: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Despacho</Label>
                  <Input 
                    placeholder="Ej: Juzgado 3 Civil del Circuito de Bogotá"
                    value={newProcess.despacho}
                    onChange={e => setNewProcess({ ...newProcess, despacho: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Proceso</Label>
                  <Select 
                    value={newProcess.proceso_tipo} 
                    onValueChange={v => setNewProcess({ ...newProcess, proceso_tipo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="civil">Civil</SelectItem>
                      <SelectItem value="laboral">Laboral</SelectItem>
                      <SelectItem value="penal">Penal</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                      <SelectItem value="familia">Familia</SelectItem>
                      <SelectItem value="constitucional">Constitucional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Demandante</Label>
                    <Input 
                      placeholder="Nombre del demandante"
                      value={newProcess.demandante}
                      onChange={e => setNewProcess({ ...newProcess, demandante: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Demandado</Label>
                    <Input 
                      placeholder="Nombre del demandado"
                      value={newProcess.demandado}
                      onChange={e => setNewProcess({ ...newProcess, demandado: e.target.value })}
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={addProcess}>
                  Agregar y Sincronizar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Process List */}
        <Card className="lg:col-span-1">
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProcesses.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay procesos monitoreados</p>
                  <Button variant="link" onClick={() => setShowAddDialog(true)}>
                    Agregar primer proceso
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredProcesses.map(process => (
                    <button
                      key={process.id}
                      className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                        selectedProcess?.id === process.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => {
                        setSelectedProcess(process);
                        loadActuations(process.id);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm font-medium truncate">{process.radicado}</p>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {process.demandante} vs {process.demandado}
                          </p>
                        </div>
                        <Badge variant="outline" className={getStatusColor(process.estado)}>
                          {process.estado}
                        </Badge>
                      </div>
                      {process.ultima_actuacion_fecha && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Última actuación: {format(new Date(process.ultima_actuacion_fecha), 'dd/MM HH:mm')}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Process Details */}
        <Card className="lg:col-span-2">
          {selectedProcess ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="font-mono">{selectedProcess.radicado}</CardTitle>
                    <CardDescription>{selectedProcess.despacho || 'Despacho no especificado'}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => syncProcess(selectedProcess.id)}
                      disabled={syncing || !canSync}
                    >
                      {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a 
                        href={`https://consultaprocesos.ramajudicial.gov.co/procesos/buscador?radicado=${selectedProcess.radicado}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Demandante:</span>
                    <p className="font-medium">{selectedProcess.demandante || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Demandado:</span>
                    <p className="font-medium">{selectedProcess.demandado || '-'}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="actuaciones">
                  <TabsList>
                    <TabsTrigger value="actuaciones">Actuaciones</TabsTrigger>
                    <TabsTrigger value="alertas">Alertas Configuradas</TabsTrigger>
                  </TabsList>
                  <TabsContent value="actuaciones" className="mt-4">
                    {loadingActuations ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : actuations.length === 0 ? (
                      <div className="text-center p-8 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay actuaciones registradas</p>
                        <p className="text-sm">Sincroniza para obtener las actuaciones</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {actuations.map((act, index) => (
                            <div 
                              key={act.id} 
                              className={`relative pl-6 pb-4 ${index !== actuations.length - 1 ? 'border-l-2 border-muted' : ''}`}
                            >
                              <div className={`absolute -left-2 top-0 h-4 w-4 rounded-full border-2 ${
                                act.is_new ? 'bg-primary border-primary' : 'bg-background border-muted-foreground'
                              }`} />
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{act.actuacion}</p>
                                    {act.is_new && (
                                      <Badge className="text-xs">Nueva</Badge>
                                    )}
                                  </div>
                                  {act.anotacion && (
                                    <p className="text-sm text-muted-foreground mt-1">{act.anotacion}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {format(new Date(act.fecha_actuacion), "d 'de' MMMM yyyy", { locale: es })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>
                  <TabsContent value="alertas" className="mt-4">
                    <div className="text-center p-8 text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Configuración de alertas próximamente</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Selecciona un proceso para ver sus detalles</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}