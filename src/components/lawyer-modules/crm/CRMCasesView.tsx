import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, Trash2, Calendar, DollarSign, Clock, FileText, History, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import CaseTraceabilityModal from './CaseTraceabilityModal';
import { generateCasePDF } from '@/utils/pdfGenerator';

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
  billing_rate?: number;
  estimated_hours?: number;
  actual_hours: number;
  created_at: string;
  client?: {
    name: string;
    email: string;
  };
}

interface CRMCasesViewProps {
  lawyerData: any;
  searchTerm: string;
  onRefresh: () => void;
}

const CRMCasesView: React.FC<CRMCasesViewProps> = ({ lawyerData, searchTerm, onRefresh }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [traceabilityModalOpen, setTraceabilityModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    case_number: '',
    title: '',
    description: '',
    case_type: '',
    status: 'active',
    priority: 'medium',
    start_date: '',
    end_date: '',
    billing_rate: '',
    estimated_hours: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (lawyerData?.id) {
      fetchCases();
      fetchClients();
    }
  }, [lawyerData?.id]);

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
      toast({
        title: "Error",
        description: "No se pudieron cargar los casos",
        variant: "destructive",
      });
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

  const filteredCases = cases.filter(case_ =>
    case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    case_.case_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (case_.client?.name && case_.client.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSaveCase = async () => {
    try {
      const caseData = {
        ...formData,
        lawyer_id: lawyerData.id,
        billing_rate: formData.billing_rate ? parseFloat(formData.billing_rate) : null,
        estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      };

      if (editingCase) {
        const { error } = await supabase
          .from('crm_cases')
          .update(caseData)
          .eq('id', editingCase.id);

        if (error) throw error;
        toast({
          title: "Caso actualizado",
          description: "Los datos del caso se han actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from('crm_cases')
          .insert([caseData]);

        if (error) throw error;
        toast({
          title: "Caso creado",
          description: "El nuevo caso se ha creado correctamente",
        });
      }

      setIsDialogOpen(false);
      setEditingCase(null);
      resetForm();
      fetchCases();
      onRefresh();
    } catch (error) {
      console.error('Error saving case:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el caso",
        variant: "destructive",
      });
    }
  };

  const handleEditCase = (case_: Case) => {
    setEditingCase(case_);
    setFormData({
      client_id: case_.client_id,
      case_number: case_.case_number || '',
      title: case_.title,
      description: case_.description || '',
      case_type: case_.case_type,
      status: case_.status,
      priority: case_.priority,
      start_date: case_.start_date || '',
      end_date: case_.end_date || '',
      billing_rate: case_.billing_rate?.toString() || '',
      estimated_hours: case_.estimated_hours?.toString() || ''
    });
    setIsDialogOpen(true);
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este caso?')) return;

    try {
      const { error } = await supabase
        .from('crm_cases')
        .delete()
        .eq('id', caseId);

      if (error) throw error;

      toast({
        title: "Caso eliminado",
        description: "El caso se ha eliminado correctamente",
      });

      fetchCases();
      onRefresh();
    } catch (error) {
      console.error('Error deleting case:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el caso",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      case_number: '',
      title: '',
      description: '',
      case_type: '',
      status: 'active',
      priority: 'medium',
      start_date: '',
      end_date: '',
      billing_rate: '',
      estimated_hours: ''
    });
  };

  const handleViewTraceability = async (case_: Case) => {
    setSelectedCase(case_);
    setTraceabilityModalOpen(true);
  };

  const handleGeneratePDF = async (case_: Case) => {
    try {
      const { data: activities } = await supabase
        .from('crm_case_activities')
        .select('*')
        .eq('case_id', case_.id)
        .order('activity_date', { ascending: true });

      // Generate PDF using the dedicated utility
      generateCasePDF(case_, activities || []);

      toast({
        title: "Reporte generado",
        description: "El reporte PDF del caso se ha descargado correctamente",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el reporte PDF",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'closed': return 'secondary';
      case 'on_hold': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestión de Casos</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingCase(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Caso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCase ? 'Editar Caso' : 'Nuevo Caso'}
              </DialogTitle>
              <DialogDescription>
                {editingCase ? 'Modifica los datos del caso' : 'Ingresa los datos del nuevo caso'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label htmlFor="client_id">Cliente *</Label>
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
                        {client.name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="case_number">Número de Caso</Label>
                <Input
                  id="case_number"
                  value={formData.case_number}
                  onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
                  placeholder="Ej: CASO-2024-001"
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="title">Título del Caso *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título descriptivo del caso"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="case_type">Tipo de Caso *</Label>
                <Input
                  id="case_type"
                  value={formData.case_type}
                  onChange={(e) => setFormData({ ...formData, case_type: e.target.value })}
                  placeholder="Ej: Civil, Penal, Laboral"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="on_hold">En Espera</SelectItem>
                    <SelectItem value="closed">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="start_date">Fecha de Inicio</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_date">Fecha de Fin</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="billing_rate">Tarifa por Hora (COP)</Label>
                <Input
                  id="billing_rate"
                  type="number"
                  value={formData.billing_rate}
                  onChange={(e) => setFormData({ ...formData, billing_rate: e.target.value })}
                  placeholder="100000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="estimated_hours">Horas Estimadas</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                  placeholder="40"
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción detallada del caso"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveCase}>
                {editingCase ? 'Actualizar' : 'Crear'} Caso
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cases Grid */}
      <div className="grid gap-4">
        {filteredCases.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron casos que coincidan con la búsqueda' : 'No tienes casos registrados aún'}
              </p>
              {!searchTerm && (
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer caso
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredCases.map((case_) => (
            <Card key={case_.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{case_.title}</h3>
                      <Badge variant={getStatusBadgeVariant(case_.status)}>
                        {case_.status === 'active' ? 'Activo' : case_.status === 'closed' ? 'Cerrado' : 'En Espera'}
                      </Badge>
                      <Badge variant={getPriorityBadgeVariant(case_.priority)}>
                        {case_.priority === 'high' ? 'Alta' : case_.priority === 'medium' ? 'Media' : 'Baja'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p><strong>Cliente:</strong> {case_.client?.name}</p>
                      <p><strong>Tipo:</strong> {case_.case_type}</p>
                      {case_.case_number && (
                        <p><strong>Número:</strong> {case_.case_number}</p>
                      )}
                      {case_.billing_rate && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-3 w-3" />
                          <span>${case_.billing_rate.toLocaleString()}/hora</span>
                        </div>
                      )}
                      {case_.estimated_hours && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>{case_.estimated_hours}h estimadas | {case_.actual_hours}h trabajadas</span>
                        </div>
                      )}
                      {case_.start_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>Inicio: {format(new Date(case_.start_date), 'dd MMM yyyy', { locale: es })}</span>
                        </div>
                      )}
                    </div>
                    
                    {case_.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {case_.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewTraceability(case_)}
                      title="Ver trazabilidad"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGeneratePDF(case_)}
                      title="Generar reporte PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCase(case_)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCase(case_.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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