import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, Trash2, Calendar, FileText, Download, LayoutGrid, List, ExternalLink, AlertTriangle, User, HelpCircle, CloudCog, FolderOpen } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import CaseTraceabilityModal from './CaseTraceabilityModal';
import { generateCasePDF } from '@/utils/pdfGenerator';

const CLASES_PROCESO = [
  'Pertenencia',
  'Ejecutivo',
  'Ejecutivo Singular',
  'Ejecutivo Laboral',
  'Ejecutivo de Alimentos',
  'Reivindicatorio',
  'Responsabilidad Civil Extracontractual',
  'Ordinario Laboral',
  'Sucesión',
  'Unión Marital de Hecho',
  'Nulidad y Restablecimiento del Derecho',
  'Reparación Directa',
  'Divisorio',
  'Simulación',
  'Servidumbre Petrolera',
  'Designación de Apoyo',
  'Acción Popular',
  'Acción de Tutela',
  'Acción de Cumplimiento',
  'Acción Contractual',
  'Verbal',
  'Verbal Sumario',
  'Otro',
];

interface Case {
  id: string;
  client_id: string;
  case_number?: string;
  title: string;
  description?: string;
  case_type: string;
  status: string;
  priority: string;
  start_date?: string;
  end_date?: string;
  actual_hours: number;
  created_at: string;
  juzgado?: string;
  clase_proceso?: string;
  demandante?: string;
  demandado?: string;
  asignado_a?: string;
  nota_pendiente?: string;
  
  enlace_expediente?: string;
  client?: {
    name: string;
    email: string;
  };
}

interface CRMCasesViewProps {
  lawyerData: any;
  searchTerm: string;
  onRefresh: () => void;
  autoOpenCreate?: boolean;
  onAutoOpenHandled?: () => void;
}

const CRMCasesView: React.FC<CRMCasesViewProps> = ({ lawyerData, searchTerm, onRefresh, autoOpenCreate, onAutoOpenHandled }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [traceabilityModalOpen, setTraceabilityModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [filterJuzgado, setFilterJuzgado] = useState('');
  const [filterAsignado, setFilterAsignado] = useState('');
  const [filterClase, setFilterClase] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [formData, setFormData] = useState({
    client_id: '',
    case_number: '',
    description: '',
    case_type: '',
    status: 'active',
    priority: 'medium',
    start_date: '',
    end_date: '',
    juzgado: '',
    clase_proceso: '',
    demandante: '',
    demandado: '',
    asignado_a: '',
    nota_pendiente: '',
    enlace_expediente: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (lawyerData?.id) {
      fetchCases();
      fetchClients();
    }
  }, [lawyerData?.id]);

  useEffect(() => {
    if (autoOpenCreate) {
      resetForm();
      setEditingCase(null);
      setIsDialogOpen(true);
      onAutoOpenHandled?.();
    }
  }, [autoOpenCreate]);

  const fetchCases = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('crm_cases')
        .select(`
          *,
          client:crm_clients(name, email)
        `)
        .eq('lawyer_id', lawyerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error fetching cases:', error);
      toast({ title: "Error", description: "No se pudieron cargar los casos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_clients')
        .select('id, name, email')
        .eq('lawyer_id', lawyerData.id)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  // Generate auto-title from structured fields
  const generateTitle = (data: typeof formData) => {
    const clase = data.clase_proceso || data.case_type || 'Caso';
    const demandante = data.demandante || '';
    const demandado = data.demandado || '';
    if (demandante && demandado) return `${clase} - ${demandante} vs ${demandado}`;
    if (demandante) return `${clase} - ${demandante}`;
    return clase;
  };

  // Unique values for filters
  const uniqueJuzgados = [...new Set(cases.map(c => c.juzgado).filter(Boolean))] as string[];
  const uniqueAsignados = [...new Set(cases.map(c => c.asignado_a).filter(Boolean))] as string[];
  const uniqueClases = [...new Set(cases.map(c => c.clase_proceso || c.case_type).filter(Boolean))] as string[];

  const filteredCases = cases.filter(case_ => {
    const matchesSearch = !searchTerm || 
      case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.case_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (case_.client?.name && case_.client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (case_.case_number && case_.case_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (case_.demandante && case_.demandante.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (case_.demandado && case_.demandado.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (case_.juzgado && case_.juzgado.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesJuzgado = !filterJuzgado || filterJuzgado === 'all' || case_.juzgado === filterJuzgado;
    const matchesAsignado = !filterAsignado || filterAsignado === 'all' || case_.asignado_a === filterAsignado;
    const matchesClase = !filterClase || filterClase === 'all' || (case_.clase_proceso || case_.case_type) === filterClase;
    const matchesStatus = !filterStatus || filterStatus === 'all' || case_.status === filterStatus;

    return matchesSearch && matchesJuzgado && matchesAsignado && matchesClase && matchesStatus;
  });

  const handleSaveCase = async () => {
    try {
      const title = generateTitle(formData);
      const caseData: any = {
        client_id: formData.client_id,
        case_number: formData.case_number || null,
        title,
        description: formData.description || null,
        case_type: formData.clase_proceso || formData.case_type || 'General',
        status: formData.status,
        priority: formData.priority,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        lawyer_id: lawyerData.id,
        juzgado: formData.juzgado || null,
        clase_proceso: formData.clase_proceso || null,
        demandante: formData.demandante || null,
        demandado: formData.demandado || null,
        asignado_a: formData.asignado_a || null,
        nota_pendiente: formData.nota_pendiente || null,
        
        enlace_expediente: formData.enlace_expediente || null,
      };

      if (editingCase) {
        const { error } = await supabase.from('crm_cases').update(caseData).eq('id', editingCase.id);
        if (error) throw error;
        toast({ title: "Caso actualizado", description: "Los datos del caso se han actualizado correctamente" });
      } else {
        const { error } = await supabase.from('crm_cases').insert([caseData]);
        if (error) throw error;
        toast({ title: "Caso creado", description: "El nuevo caso se ha creado correctamente" });
      }

      setIsDialogOpen(false);
      setEditingCase(null);
      resetForm();
      fetchCases();
      onRefresh();
    } catch (error) {
      console.error('Error saving case:', error);
      toast({ title: "Error", description: "No se pudo guardar el caso", variant: "destructive" });
    }
  };

  const handleEditCase = (case_: Case) => {
    setEditingCase(case_);
    setFormData({
      client_id: case_.client_id,
      case_number: case_.case_number || '',
      description: case_.description || '',
      case_type: case_.case_type,
      status: case_.status,
      priority: case_.priority,
      start_date: case_.start_date || '',
      end_date: case_.end_date || '',
      juzgado: case_.juzgado || '',
      clase_proceso: case_.clase_proceso || '',
      demandante: case_.demandante || '',
      demandado: case_.demandado || '',
      asignado_a: case_.asignado_a || '',
      nota_pendiente: case_.nota_pendiente || '',
      
      enlace_expediente: case_.enlace_expediente || '',
    });
    setIsDialogOpen(true);
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este caso?')) return;
    try {
      const { error } = await supabase.from('crm_cases').delete().eq('id', caseId);
      if (error) throw error;
      toast({ title: "Caso eliminado", description: "El caso se ha eliminado correctamente" });
      fetchCases();
      onRefresh();
    } catch (error) {
      console.error('Error deleting case:', error);
      toast({ title: "Error", description: "No se pudo eliminar el caso", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '', case_number: '', description: '', case_type: '',
      status: 'active', priority: 'medium', start_date: '', end_date: '',
      juzgado: '', clase_proceso: '', demandante: '', demandado: '',
      asignado_a: '', nota_pendiente: '', enlace_expediente: '',
    });
  };

  const handleViewTraceability = (case_: Case) => {
    setSelectedCase(case_);
    setTraceabilityModalOpen(true);
  };

  const handleGeneratePDF = async (case_: Case) => {
    try {
      const { data: activities } = await supabase
        .from('crm_case_activities').select('*').eq('case_id', case_.id)
        .order('activity_date', { ascending: true });
      generateCasePDF(case_, activities || []);
      toast({ title: "Reporte generado", description: "El reporte PDF del caso se ha descargado correctamente" });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: "Error", description: "No se pudo generar el reporte PDF", variant: "destructive" });
    }
  };

  const handleUpdateNotaPendiente = async (caseId: string, nota: string) => {
    try {
      const { error } = await supabase.from('crm_cases').update({ nota_pendiente: nota || null }).eq('id', caseId);
      if (error) throw error;
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, nota_pendiente: nota } : c));
    } catch (error) {
      console.error('Error updating nota:', error);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'closed': return 'Cerrado';
      case 'on_hold': return 'En Espera';
      default: return status;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default' as const;
      case 'closed': return 'secondary' as const;
      case 'on_hold': return 'outline' as const;
      default: return 'secondary' as const;
    }
  };

  const isUrgentNote = (nota?: string) => {
    if (!nota) return false;
    const upper = nota.toUpperCase();
    return upper.includes('URGENTE') || upper.includes('OJO') || upper.includes('PENDIENTE');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const caseFormContent = (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editingCase ? 'Editar Proceso' : 'Nuevo Proceso'}</DialogTitle>
        <DialogDescription>
          {editingCase ? 'Modifica los datos del proceso' : 'Ingresa los datos del nuevo proceso judicial'}
        </DialogDescription>
      </DialogHeader>
      
      <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2">
        {/* Radicado */}
        <div className="space-y-2">
          <Label>Radicado</Label>
          <Input
            value={formData.case_number}
            onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
            placeholder="500064089001-2024-00096-00"
          />
        </div>

        {/* Juzgado */}
        <div className="space-y-2">
          <Label>Juzgado / Despacho</Label>
          <Input
            value={formData.juzgado}
            onChange={(e) => setFormData({ ...formData, juzgado: e.target.value })}
            placeholder="Ej: Juzgado 1° Civil del Circuito"
          />
        </div>

        {/* Clase de Proceso */}
        <div className="space-y-2">
          <Label>Clase de Proceso *</Label>
          <Select
            value={formData.clase_proceso}
            onValueChange={(value) => setFormData({ ...formData, clase_proceso: value, case_type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona clase de proceso" />
            </SelectTrigger>
            <SelectContent>
              {CLASES_PROCESO.map(clase => (
                <SelectItem key={clase} value={clase}>{clase}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cliente */}
        <div className="space-y-2">
          <Label>Cliente *</Label>
          <Select
            value={formData.client_id}
            onValueChange={(value) => setFormData({ ...formData, client_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Demandante */}
        <div className="space-y-2">
          <Label>Demandante</Label>
          <Input
            value={formData.demandante}
            onChange={(e) => setFormData({ ...formData, demandante: e.target.value })}
            placeholder="Nombre del demandante"
          />
        </div>

        {/* Demandado */}
        <div className="space-y-2">
          <Label>Demandado</Label>
          <Input
            value={formData.demandado}
            onChange={(e) => setFormData({ ...formData, demandado: e.target.value })}
            placeholder="Nombre del demandado"
          />
        </div>

        {/* Asignado A */}
        <div className="space-y-2">
          <Label>Asignado A</Label>
          <Input
            value={formData.asignado_a}
            onChange={(e) => setFormData({ ...formData, asignado_a: e.target.value })}
            placeholder="Ej: Miguel, Diana, Lady"
          />
        </div>

        {/* Estado */}
        <div className="space-y-2">
          <Label>Estado</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="on_hold">En Espera</SelectItem>
              <SelectItem value="closed">Cerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Prioridad */}
        <div className="space-y-2">
          <Label>Prioridad</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => setFormData({ ...formData, priority: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Fecha Inicio */}
        <div className="space-y-2">
          <Label>Fecha de Inicio</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />
        </div>

        {/* Nota Pendiente */}
        <div className="col-span-2 space-y-2">
          <Label>Nota Pendiente / Tarea Urgente</Label>
          <Textarea
            value={formData.nota_pendiente}
            onChange={(e) => setFormData({ ...formData, nota_pendiente: e.target.value })}
            placeholder="Ej: URGENTE - Cumplir requerimiento del juzgado antes del viernes"
            rows={2}
          />
        </div>

        {/* Enlaces */}
        <div className="col-span-2 space-y-4 rounded-lg border border-border/60 bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FolderOpen className="h-4 w-4 text-primary" />
            Enlaces del Proceso
          </div>

          {/* Expediente Digital */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label className="text-sm">Expediente Digital (OneDrive Rama Judicial)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    <p className="font-medium mb-1">¿Cómo obtener el enlace?</p>
                    <ol className="list-decimal pl-3 space-y-0.5">
                      <li>El juzgado comparte la carpeta del expediente por correo o notificación</li>
                      <li>Abre el correo del juzgado y copia el enlace de OneDrive</li>
                      <li>Pégalo aquí para acceder rápidamente</li>
                    </ol>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <CloudCog className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={formData.enlace_expediente}
                  onChange={(e) => setFormData({ ...formData, enlace_expediente: e.target.value })}
                  placeholder="Pega aquí el enlace de OneDrive del juzgado"
                  className="pl-9 flex-1"
                />
              </div>
              {formData.enlace_expediente && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => window.open(formData.enlace_expediente, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir Expediente
                </Button>
              )}
            </div>
            {formData.enlace_expediente && !formData.enlace_expediente.includes('onedrive') && !formData.enlace_expediente.includes('sharepoint') && !formData.enlace_expediente.includes('1drv.ms') && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Este enlace no parece ser de OneDrive. Verifica que sea el correcto.
              </p>
            )}
          </div>

        </div>

        {/* Descripción */}
        <div className="col-span-2 space-y-2">
          <Label>Observaciones</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Notas adicionales sobre el proceso"
            rows={2}
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
        <Button onClick={handleSaveCase}>{editingCase ? 'Actualizar' : 'Crear'} Proceso</Button>
      </div>
    </DialogContent>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Gestión de Procesos</h2>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-l-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingCase(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Proceso
              </Button>
            </DialogTrigger>
            {caseFormContent}
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {uniqueJuzgados.length > 0 && (
          <Select value={filterJuzgado} onValueChange={setFilterJuzgado}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder="Filtrar por Juzgado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Juzgados</SelectItem>
              {uniqueJuzgados.map(j => (
                <SelectItem key={j} value={j}>{j}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {uniqueAsignados.length > 0 && (
          <Select value={filterAsignado} onValueChange={setFilterAsignado}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Filtrar por Asignado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {uniqueAsignados.map(a => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="on_hold">En Espera</SelectItem>
            <SelectItem value="closed">Cerrado</SelectItem>
          </SelectContent>
        </Select>
        {(filterJuzgado || filterAsignado || filterClase || filterStatus) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {
            setFilterJuzgado('');
            setFilterAsignado('');
            setFilterClase('');
            setFilterStatus('');
          }}>
            Limpiar filtros
          </Button>
        )}
        <span className="text-xs text-muted-foreground self-center ml-auto">
          {filteredCases.length} proceso{filteredCases.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      {filteredCases.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No se encontraron procesos que coincidan' : 'No tienes procesos registrados aún'}
            </p>
            {!searchTerm && (
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primer proceso
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-[180px]">Radicado</TableHead>
                <TableHead className="text-xs">Juzgado</TableHead>
                <TableHead className="text-xs">Clase</TableHead>
                <TableHead className="text-xs">Demandante</TableHead>
                <TableHead className="text-xs">Demandado</TableHead>
                <TableHead className="text-xs">Cliente</TableHead>
                <TableHead className="text-xs">Asignado</TableHead>
                <TableHead className="text-xs">Nota Pendiente</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-xs w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.map(case_ => (
                <TableRow key={case_.id} className="group">
                  <TableCell className="text-xs font-mono">
                    {case_.case_number || '—'}
                  </TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">
                    {case_.juzgado || '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {case_.clase_proceso || case_.case_type}
                  </TableCell>
                  <TableCell className="text-xs">
                    {case_.demandante || '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {case_.demandado || '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {case_.client?.name || '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {case_.asignado_a || '—'}
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px]">
                    {case_.nota_pendiente ? (
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                        isUrgentNote(case_.nota_pendiente) 
                          ? 'bg-destructive/10 text-destructive font-medium' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {isUrgentNote(case_.nota_pendiente) && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                        {case_.nota_pendiente.length > 50 ? case_.nota_pendiente.slice(0, 50) + '...' : case_.nota_pendiente}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(case_.status)} className="text-xs">
                      {getStatusLabel(case_.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleViewTraceability(case_)} title="Actividades">
                        <Plus className="h-3 w-3" />
                      </Button>
                      {case_.enlace_expediente && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(case_.enlace_expediente, '_blank')} title="Expediente Digital">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditCase(case_)} title="Editar">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteCase(case_.id)} title="Eliminar">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* CARD VIEW */
        <div className="grid gap-3">
          {filteredCases.map(case_ => (
            <Card key={case_.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{case_.title}</h3>
                      <Badge variant={getStatusBadgeVariant(case_.status)} className="text-xs">
                        {getStatusLabel(case_.status)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {case_.case_number && <p><strong>Radicado:</strong> {case_.case_number}</p>}
                      {case_.juzgado && <p><strong>Juzgado:</strong> {case_.juzgado}</p>}
                      {case_.demandante && <p><strong>Dte:</strong> {case_.demandante}</p>}
                      {case_.demandado && <p><strong>Ddo:</strong> {case_.demandado}</p>}
                      <p><strong>Cliente:</strong> {case_.client?.name}</p>
                      {case_.asignado_a && <p><strong>Asignado:</strong> {case_.asignado_a}</p>}
                      {case_.start_date && (
                        <p className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(case_.start_date), 'dd MMM yyyy', { locale: es })}
                        </p>
                      )}
                    </div>

                    {/* Nota Pendiente destacada */}
                    {case_.nota_pendiente && (
                      <div className={`text-xs px-2 py-1.5 rounded border ${
                        isUrgentNote(case_.nota_pendiente)
                          ? 'bg-destructive/10 border-destructive/30 text-destructive'
                          : 'bg-muted border-border text-muted-foreground'
                      }`}>
                        {isUrgentNote(case_.nota_pendiente) && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                        {case_.nota_pendiente}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => handleViewTraceability(case_)} title="Actividades">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Actividad
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleGeneratePDF(case_)} title="PDF">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditCase(case_)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleDeleteCase(case_.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Traceability Modal */}
      {selectedCase && (
        <CaseTraceabilityModal
          isOpen={traceabilityModalOpen}
          onClose={() => setTraceabilityModalOpen(false)}
          caseData={selectedCase}
          lawyerData={lawyerData}
        />
      )}
    </div>
  );
};

export default CRMCasesView;
