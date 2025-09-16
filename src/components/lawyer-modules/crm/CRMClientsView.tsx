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
import { Plus, Edit2, Trash2, Phone, Mail, Building, User, Users, Calendar, UserPlus, MessageSquare } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  client_type: string;
  status: string;
  tags: string[];
  notes?: string;
  created_at: string;
}

interface CRMClientsViewProps {
  lawyerData: any;
  searchTerm: string;
  onRefresh: () => void;
}

const CRMClientsView: React.FC<CRMClientsViewProps> = ({ lawyerData, searchTerm, onRefresh }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    client_type: 'individual',
    status: 'active',
    tags: [] as string[],
    notes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (lawyerData?.id) {
      fetchClients();
    }
  }, [lawyerData?.id]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('crm_clients')
        .select('*')
        .eq('lawyer_id', lawyerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSaveClient = async () => {
    try {
      const clientData = {
        ...formData,
        lawyer_id: lawyerData.id
      };

      if (editingClient) {
        const { error } = await supabase
          .from('crm_clients')
          .update(clientData)
          .eq('id', editingClient.id);

        if (error) throw error;
        toast({
          title: "Cliente actualizado",
          description: "Los datos del cliente se han actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from('crm_clients')
          .insert([clientData]);

        if (error) throw error;
        toast({
          title: "Cliente creado",
          description: "El nuevo cliente se ha creado correctamente",
        });
      }

      setIsDialogOpen(false);
      setEditingClient(null);
      resetForm();
      fetchClients();
      onRefresh();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el cliente",
        variant: "destructive",
      });
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      company: client.company || '',
      address: client.address || '',
      client_type: client.client_type,
      status: client.status,
      tags: client.tags,
      notes: client.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) return;

    try {
      const { error } = await supabase
        .from('crm_clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: "Cliente eliminado",
        description: "El cliente se ha eliminado correctamente",
      });

      fetchClients();
      onRefresh();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      client_type: 'individual',
      status: 'active',
      tags: [],
      notes: ''
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'prospect': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'prospect': return 'Prospecto';
      default: return status;
    }
  };

  const handleQuickAction = async (action: string, client: Client) => {
    switch (action) {
      case 'call':
        if (client.phone) {
          window.open(`tel:${client.phone}`);
        } else {
          toast({
            title: "Sin número de teléfono",
            description: "Este cliente no tiene un número de teléfono registrado",
            variant: "destructive",
          });
        }
        break;
      case 'email':
        window.open(`mailto:${client.email}`);
        break;
      case 'meeting':
        toast({
          title: "Programar reunión",
          description: `Función de calendario para ${client.name} próximamente disponible`,
        });
        break;
      case 'case':
        toast({
          title: "Crear nuevo caso",
          description: `Redirigiendo para crear caso para ${client.name}`,
        });
        break;
      default:
        break;
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
    <div className="space-y-4 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <h2 className="text-lg sm:text-xl font-semibold">Gestión de Clientes</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full sm:w-auto" 
              onClick={() => { resetForm(); setEditingClient(null); }}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Nuevo Cliente</span>
              <span className="xs:hidden">Nuevo</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {editingClient ? 'Modifica los datos del cliente' : 'Ingresa los datos del nuevo cliente'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre completo"
                  className="text-base"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  className="text-base"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+57 300 123 4567"
                  className="text-base"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company" className="text-sm">Empresa</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Nombre de la empresa"
                  className="text-base"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client_type" className="text-sm">Tipo de Cliente</Label>
                <Select
                  value={formData.client_type}
                  onValueChange={(value) => 
                    setFormData({ ...formData, client_type: value })
                  }
                >
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Persona Natural</SelectItem>
                    <SelectItem value="company">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Selecciona el estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="prospect">Prospecto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label htmlFor="address" className="text-sm">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Dirección completa"
                  className="text-base"
                />
              </div>
              
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label htmlFor="notes" className="text-sm">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas adicionales sobre el cliente"
                  rows={3}
                  className="text-base resize-none"
                />
              </div>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveClient}
                className="w-full sm:w-auto"
              >
                {editingClient ? 'Actualizar' : 'Crear'} Cliente
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Clients Grid */}
      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <Users className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
              <p className="text-sm sm:text-base text-muted-foreground">
                {searchTerm ? 'No se encontraron clientes que coincidan con la búsqueda' : 'No tienes clientes registrados aún'}
              </p>
              {!searchTerm && (
                <Button 
                  className="mt-3 sm:mt-4 w-full sm:w-auto" 
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer cliente
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id} className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start sm:items-center gap-2 mb-2 flex-wrap">
                      {client.client_type === 'company' ? (
                        <Building className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />
                      )}
                      <h3 className="font-semibold text-sm sm:text-base truncate flex-1 min-w-0">
                        {client.name}
                      </h3>
                      <Badge 
                        variant={getStatusBadgeVariant(client.status)}
                        className="text-xs flex-shrink-0"
                      >
                        {getStatusText(client.status)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{client.phone}</span>
                        </div>
                      )}
                      {client.company && (
                        <div className="flex items-center gap-2">
                          <Building className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{client.company}</span>
                        </div>
                      )}
                    </div>
                    
                    {client.notes && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
                        {client.notes}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-1 self-start sm:self-center flex-shrink-0 flex-wrap">
                    {/* Quick Actions */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction('call', client)}
                      title="Llamar cliente"
                      className="h-8 w-8 p-0"
                    >
                      <Phone className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction('email', client)}
                      title="Enviar email"
                      className="h-8 w-8 p-0"
                    >
                      <Mail className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction('meeting', client)}
                      title="Programar reunión"
                      className="h-8 w-8 p-0"
                    >
                      <Calendar className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction('case', client)}
                      title="Crear nuevo caso"
                      className="h-8 w-8 p-0"
                    >
                      <UserPlus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClient(client)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClient(client.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
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

export default CRMClientsView;