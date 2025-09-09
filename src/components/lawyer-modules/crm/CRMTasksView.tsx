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
import { Plus, Edit2, Trash2, Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Task {
  id: string;
  client_id?: string;
  case_id?: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  due_date?: string;
  completed_at?: string;
  assigned_to?: string;
  created_at: string;
  client?: {
    name: string;
    email: string;
  };
  case?: {
    title: string;
  };
}

interface CRMTasksViewProps {
  lawyerData: any;
  searchTerm: string;
  onRefresh: () => void;
}

const CRMTasksView: React.FC<CRMTasksViewProps> = ({ lawyerData, searchTerm, onRefresh }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    case_id: '',
    title: '',
    description: '',
    type: 'general',
    status: 'pending',
    priority: 'medium',
    due_date: '',
    assigned_to: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (lawyerData?.id) {
      fetchTasks();
      fetchClients();
      fetchCases();
    }
  }, [lawyerData?.id]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('crm_tasks')
        .select(`
          *,
          client:crm_clients(name, email),
          case:crm_cases(title)
        `)
        .eq('lawyer_id', lawyerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las tareas",
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

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_cases')
        .select('id, title, client_id')
        .eq('lawyer_id', lawyerData.id)
        .order('title');

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error fetching cases:', error);
    }
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (task.client?.name && task.client.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSaveTask = async () => {
    try {
      const taskData = {
        ...formData,
        lawyer_id: lawyerData.id,
        client_id: formData.client_id || null,
        case_id: formData.case_id || null,
        due_date: formData.due_date || null,
        assigned_to: formData.assigned_to || null
      };

      if (editingTask) {
        const { error } = await supabase
          .from('crm_tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
        toast({
          title: "Tarea actualizada",
          description: "La tarea se ha actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from('crm_tasks')
          .insert([taskData]);

        if (error) throw error;
        toast({
          title: "Tarea creada",
          description: "La nueva tarea se ha creado correctamente",
        });
      }

      setIsDialogOpen(false);
      setEditingTask(null);
      resetForm();
      fetchTasks();
      onRefresh();
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la tarea",
        variant: "destructive",
      });
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('crm_tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Tarea completada",
        description: "La tarea se ha marcado como completada",
      });

      fetchTasks();
      onRefresh();
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la tarea",
        variant: "destructive",
      });
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormData({
      client_id: task.client_id || '',
      case_id: task.case_id || '',
      title: task.title,
      description: task.description || '',
      type: task.type,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date || '',
      assigned_to: task.assigned_to || ''
    });
    setIsDialogOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) return;

    try {
      const { error } = await supabase
        .from('crm_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Tarea eliminada",
        description: "La tarea se ha eliminado correctamente",
      });

      fetchTasks();
      onRefresh();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la tarea",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      case_id: '',
      title: '',
      description: '',
      type: 'general',
      status: 'pending',
      priority: 'medium',
      due_date: '',
      assigned_to: ''
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En Progreso';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
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

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredCasesForClient = cases.filter(case_ => 
    !formData.client_id || case_.client_id === formData.client_id
  );

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
        <h2 className="text-xl font-semibold">Gestión de Tareas</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingTask(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tarea
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
              </DialogTitle>
              <DialogDescription>
                {editingTask ? 'Modifica los datos de la tarea' : 'Crea una nueva tarea'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título de la tarea"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client_id">Cliente</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value, case_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin cliente específico</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="case_id">Caso</Label>
                <Select
                  value={formData.case_id}
                  onValueChange={(value) => setFormData({ ...formData, case_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un caso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin caso específico</SelectItem>
                    {filteredCasesForClient.map((case_) => (
                      <SelectItem key={case_.id} value={case_.id}>
                        {case_.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="follow_up">Seguimiento</SelectItem>
                    <SelectItem value="document_review">Revisión de Documento</SelectItem>
                    <SelectItem value="meeting">Reunión</SelectItem>
                    <SelectItem value="court_date">Fecha de Audiencia</SelectItem>
                    <SelectItem value="deadline">Fecha Límite</SelectItem>
                  </SelectContent>
                </Select>
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
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="in_progress">En Progreso</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
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
                <Label htmlFor="due_date">Fecha de Vencimiento</Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción detallada de la tarea"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveTask}>
                {editingTask ? 'Actualizar' : 'Crear'} Tarea
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tasks List */}
      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron tareas que coincidan con la búsqueda' : 'No tienes tareas registradas aún'}
              </p>
              {!searchTerm && (
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera tarea
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(task.status)}
                      <h3 className="font-semibold">{task.title}</h3>
                      <Badge variant={getStatusBadgeVariant(task.status)}>
                        {getStatusText(task.status)}
                      </Badge>
                      <Badge variant={getPriorityBadgeVariant(task.priority)}>
                        {getPriorityText(task.priority)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground mb-2">
                      {task.client && (
                        <p><strong>Cliente:</strong> {task.client.name}</p>
                      )}
                      {task.case && (
                        <p><strong>Caso:</strong> {task.case.title}</p>
                      )}
                      <p><strong>Tipo:</strong> {task.type}</p>
                      {task.due_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>Vence: {format(new Date(task.due_date), 'dd MMM yyyy HH:mm', { locale: es })}</span>
                        </div>
                      )}
                      {task.completed_at && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Completada: {format(new Date(task.completed_at), 'dd MMM yyyy HH:mm', { locale: es })}</span>
                        </div>
                      )}
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {task.status !== 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCompleteTask(task.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTask(task)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
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
    </div>
  );
};

export default CRMTasksView;