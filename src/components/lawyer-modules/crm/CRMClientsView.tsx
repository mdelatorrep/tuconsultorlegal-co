import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, Edit2, Trash2, Phone, Mail, Building, User, Users, Calendar, 
  Briefcase, MapPin, ChevronRight, MoreHorizontal, Search, Filter,
  UserCheck, UserX, Clock, Eye, X
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  cases_count?: number;
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
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
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
      
      // Fetch clients with case count
      const { data: clientsData, error } = await supabase
        .from('crm_clients')
        .select(`
          *,
          crm_cases(id)
        `)
        .eq('lawyer_id', lawyerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const clientsWithCounts = clientsData?.map(c => ({
        ...c,
        cases_count: Array.isArray(c.crm_cases) ? c.crm_cases.length : 0
      })) || [];
      
      setClients(clientsWithCounts);
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

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    const matchesType = typeFilter === 'all' || client.client_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const stats = {
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    inactive: clients.filter(c => c.status === 'inactive').length,
    prospects: clients.filter(c => c.status === 'prospect').length,
    companies: clients.filter(c => c.client_type === 'company').length,
  };

  const handleSaveClient = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: "Campos requeridos",
        description: "El nombre y email son obligatorios",
        variant: "destructive",
      });
      return;
    }

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
          description: "El nuevo cliente se ha agregado correctamente",
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
      tags: client.tags || [],
      notes: client.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.')) return;

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

      setIsDetailOpen(false);
      setSelectedClient(null);
      fetchClients();
      onRefresh();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente. Puede tener casos asociados.",
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active': 
        return { label: 'Activo', variant: 'default' as const, color: 'text-green-600', bg: 'bg-green-500/10' };
      case 'inactive': 
        return { label: 'Inactivo', variant: 'secondary' as const, color: 'text-muted-foreground', bg: 'bg-muted' };
      case 'prospect': 
        return { label: 'Prospecto', variant: 'outline' as const, color: 'text-amber-600', bg: 'bg-amber-500/10' };
      default: 
        return { label: status, variant: 'secondary' as const, color: 'text-muted-foreground', bg: 'bg-muted' };
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const openClientDetail = (client: Client) => {
    setSelectedClient(client);
    setIsDetailOpen(true);
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
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Clientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="text-2xl font-bold text-amber-500">{stats.prospects}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Prospectos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <UserX className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold text-muted-foreground">{stats.inactive}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Inactivos</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Building className="h-4 w-4 text-blue-500" />
              <p className="text-2xl font-bold text-blue-500">{stats.companies}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Empresas</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
              <SelectItem value="prospect">Prospectos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="individual">Personas</SelectItem>
              <SelectItem value="company">Empresas</SelectItem>
            </SelectContent>
          </Select>
          {(statusFilter !== 'all' || typeFilter !== 'all') && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}
              className="h-9"
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingClient(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {editingClient ? 'Actualiza la información del cliente' : 'Completa los datos para registrar un nuevo cliente'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              {/* Basic Info */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Juan Pérez García"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+57 300 123 4567"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tipo de cliente</Label>
                    <Select
                      value={formData.client_type}
                      onValueChange={(value) => setFormData({ ...formData, client_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Persona Natural
                          </div>
                        </SelectItem>
                        <SelectItem value="company">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            Empresa
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                        <SelectItem value="prospect">Prospecto</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.client_type === 'company' && (
                  <div className="space-y-2">
                    <Label htmlFor="company">Nombre de la empresa</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Nombre de la empresa"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Calle, número, ciudad"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas adicionales</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Información adicional sobre el cliente..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveClient}>
                {editingClient ? 'Guardar Cambios' : 'Crear Cliente'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                ? 'No se encontraron clientes' 
                : 'Aún no tienes clientes'}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Prueba ajustando los filtros de búsqueda'
                : 'Comienza agregando tu primer cliente para gestionar mejor tus casos'}
            </p>
            {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar mi primer cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => {
            const statusConfig = getStatusConfig(client.status);
            
            return (
              <Card 
                key={client.id} 
                className="group hover:shadow-md transition-all cursor-pointer border-l-4"
                style={{ borderLeftColor: client.status === 'active' ? 'hsl(var(--primary))' : client.status === 'prospect' ? 'hsl(45 93% 47%)' : 'hsl(var(--muted))' }}
                onClick={() => openClientDetail(client)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarFallback className={`${statusConfig.bg} ${statusConfig.color} font-semibold`}>
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{client.name}</h3>
                          {client.company && (
                            <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {client.company}
                            </p>
                          )}
                        </div>
                        <Badge variant={statusConfig.variant} className="shrink-0 text-xs">
                          {statusConfig.label}
                        </Badge>
                      </div>
                      
                      <div className="mt-3 space-y-1">
                        <p className="text-sm text-muted-foreground truncate flex items-center gap-2">
                          <Mail className="h-3 w-3 shrink-0" />
                          {client.email}
                        </p>
                        {client.phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Phone className="h-3 w-3 shrink-0" />
                            {client.phone}
                          </p>
                        )}
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          {client.cases_count || 0} casos
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Client Detail Sheet */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedClient && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className={`${getStatusConfig(selectedClient.status).bg} ${getStatusConfig(selectedClient.status).color} text-xl font-semibold`}>
                      {getInitials(selectedClient.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <DialogTitle className="text-xl">{selectedClient.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1">
                      {selectedClient.client_type === 'company' ? (
                        <Building className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      {selectedClient.client_type === 'company' ? 'Empresa' : 'Persona Natural'}
                      <span>•</span>
                      <Badge variant={getStatusConfig(selectedClient.status).variant}>
                        {getStatusConfig(selectedClient.status).label}
                      </Badge>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Información de Contacto</h4>
                  <div className="grid gap-2">
                    <a 
                      href={`mailto:${selectedClient.email}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{selectedClient.email}</p>
                        <p className="text-xs text-muted-foreground">Correo electrónico</p>
                      </div>
                    </a>
                    
                    {selectedClient.phone && (
                      <a 
                        href={`tel:${selectedClient.phone}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                          <Phone className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{selectedClient.phone}</p>
                          <p className="text-xs text-muted-foreground">Teléfono</p>
                        </div>
                      </a>
                    )}
                    
                    {selectedClient.address && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{selectedClient.address}</p>
                          <p className="text-xs text-muted-foreground">Dirección</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedClient.company && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <Building className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{selectedClient.company}</p>
                          <p className="text-xs text-muted-foreground">Empresa</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-2xl font-bold text-primary">{selectedClient.cases_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Casos asociados</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm font-medium">
                      {format(new Date(selectedClient.created_at), "d MMM yyyy", { locale: es })}
                    </p>
                    <p className="text-xs text-muted-foreground">Cliente desde</p>
                  </div>
                </div>

                {/* Notes */}
                {selectedClient.notes && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Notas</h4>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedClient.notes}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={() => handleEditClient(selectedClient)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteClient(selectedClient.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMClientsView;