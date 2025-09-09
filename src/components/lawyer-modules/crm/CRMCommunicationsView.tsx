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
import { Plus, Edit2, Trash2, Send, Mail, MessageSquare, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Communication {
  id: string;
  client_id: string;
  case_id?: string;
  type: string;
  subject?: string;
  content: string;
  direction: string;
  scheduled_for?: string;
  sent_at?: string;
  status: string;
  created_at: string;
  client?: {
    name: string;
    email: string;
  };
  case?: {
    title: string;
  };
}

interface CRMCommunicationsViewProps {
  lawyerData: any;
  searchTerm: string;
  onRefresh: () => void;
}

const CRMCommunicationsView: React.FC<CRMCommunicationsViewProps> = ({ lawyerData, searchTerm, onRefresh }) => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCommunication, setEditingCommunication] = useState<Communication | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    case_id: '',
    type: 'email',
    subject: '',
    content: '',
    direction: 'outbound',
    scheduled_for: '',
    status: 'draft'
  });
  const { toast } = useToast();

  useEffect(() => {
    if (lawyerData?.id) {
      fetchCommunications();
      fetchClients();
      fetchCases();
    }
  }, [lawyerData?.id]);

  const fetchCommunications = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('crm_communications')
        .select(`
          *,
          client:crm_clients(name, email),
          case:crm_cases(title)
        `)
        .eq('lawyer_id', lawyerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommunications(data || []);
    } catch (error) {
      console.error('Error fetching communications:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las comunicaciones",
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

  const filteredCommunications = communications.filter(comm =>
    comm.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comm.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (comm.client?.name && comm.client.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSaveCommunication = async () => {
    try {
      const commData = {
        ...formData,
        lawyer_id: lawyerData.id,
        case_id: formData.case_id || null,
        scheduled_for: formData.scheduled_for || null
      };

      if (editingCommunication) {
        const { error } = await supabase
          .from('crm_communications')
          .update(commData)
          .eq('id', editingCommunication.id);

        if (error) throw error;
        toast({
          title: "Comunicación actualizada",
          description: "La comunicación se ha actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from('crm_communications')
          .insert([commData]);

        if (error) throw error;
        toast({
          title: "Comunicación creada",
          description: "La nueva comunicación se ha creado correctamente",
        });
      }

      setIsDialogOpen(false);
      setEditingCommunication(null);
      resetForm();
      fetchCommunications();
      onRefresh();
    } catch (error) {
      console.error('Error saving communication:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la comunicación",
        variant: "destructive",
      });
    }
  };

  const handleSendCommunication = async (commId: string) => {
    try {
      const { error } = await supabase
        .from('crm_communications')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', commId);

      if (error) throw error;

      toast({
        title: "Comunicación enviada",
        description: "La comunicación se ha marcado como enviada",
      });

      fetchCommunications();
    } catch (error) {
      console.error('Error sending communication:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar la comunicación",
        variant: "destructive",
      });
    }
  };

  const handleEditCommunication = (comm: Communication) => {
    setEditingCommunication(comm);
    setFormData({
      client_id: comm.client_id,
      case_id: comm.case_id || '',
      type: comm.type,
      subject: comm.subject || '',
      content: comm.content,
      direction: comm.direction,
      scheduled_for: comm.scheduled_for || '',
      status: comm.status
    });
    setIsDialogOpen(true);
  };

  const handleDeleteCommunication = async (commId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta comunicación?')) return;

    try {
      const { error } = await supabase
        .from('crm_communications')
        .delete()
        .eq('id', commId);

      if (error) throw error;

      toast({
        title: "Comunicación eliminada",
        description: "La comunicación se ha eliminado correctamente",
      });

      fetchCommunications();
      onRefresh();
    } catch (error) {
      console.error('Error deleting communication:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la comunicación",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      case_id: '',
      type: 'email',
      subject: '',
      content: '',
      direction: 'outbound',
      scheduled_for: '',
      status: 'draft'
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'sent': return 'default';
      case 'delivered': return 'default';
      case 'draft': return 'secondary';
      case 'scheduled': return 'outline';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'scheduled': return 'Programado';
      case 'sent': return 'Enviado';
      case 'delivered': return 'Entregado';
      case 'failed': return 'Fallido';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
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
        <h2 className="text-xl font-semibold">Comunicaciones</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingCommunication(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Comunicación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCommunication ? 'Editar Comunicación' : 'Nueva Comunicación'}
              </DialogTitle>
              <DialogDescription>
                {editingCommunication ? 'Modifica los datos de la comunicación' : 'Crea una nueva comunicación con un cliente'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_id">Cliente *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value, case_id: '' })}
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
                <Label htmlFor="case_id">Caso (Opcional)</Label>
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
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="call">Llamada</SelectItem>
                    <SelectItem value="meeting">Reunión</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="direction">Dirección</Label>
                <Select
                  value={formData.direction}
                  onValueChange={(value) => setFormData({ ...formData, direction: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la dirección" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">Saliente</SelectItem>
                    <SelectItem value="inbound">Entrante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="subject">Asunto</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Asunto de la comunicación"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scheduled_for">Programar para</Label>
                <Input
                  id="scheduled_for"
                  type="datetime-local"
                  value={formData.scheduled_for}
                  onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
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
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="scheduled">Programado</SelectItem>
                    <SelectItem value="sent">Enviado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="content">Contenido *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Contenido de la comunicación"
                  rows={6}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveCommunication}>
                {editingCommunication ? 'Actualizar' : 'Crear'} Comunicación
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Communications List */}
      <div className="grid gap-4">
        {filteredCommunications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron comunicaciones que coincidan con la búsqueda' : 'No tienes comunicaciones registradas aún'}
              </p>
              {!searchTerm && (
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera comunicación
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredCommunications.map((comm) => (
            <Card key={comm.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeIcon(comm.type)}
                      <h3 className="font-semibold">{comm.subject || 'Sin asunto'}</h3>
                      <Badge variant={getStatusBadgeVariant(comm.status)}>
                        {getStatusText(comm.status)}
                      </Badge>
                      {comm.direction === 'inbound' && (
                        <Badge variant="outline">Entrante</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground mb-2">
                      <p><strong>Cliente:</strong> {comm.client?.name} ({comm.client?.email})</p>
                      {comm.case && (
                        <p><strong>Caso:</strong> {comm.case.title}</p>
                      )}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Creado: {format(new Date(comm.created_at), 'dd MMM yyyy HH:mm', { locale: es })}</span>
                        </div>
                        {comm.scheduled_for && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Programado: {format(new Date(comm.scheduled_for), 'dd MMM yyyy HH:mm', { locale: es })}</span>
                          </div>
                        )}
                        {comm.sent_at && (
                          <div className="flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            <span>Enviado: {format(new Date(comm.sent_at), 'dd MMM yyyy HH:mm', { locale: es })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {comm.content}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {comm.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendCommunication(comm.id)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCommunication(comm)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCommunication(comm.id)}
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

export default CRMCommunicationsView;