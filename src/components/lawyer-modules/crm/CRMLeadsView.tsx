import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  UserPlus, 
  Mail, 
  Phone, 
  Calendar,
  Loader2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  origin: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  created_at: string;
}

interface Props {
  searchTerm: string;
  onRefresh: () => void;
  lawyerData: any;
}

const statusConfig = {
  new: { label: 'Nuevo', color: 'bg-blue-100 text-blue-700', icon: UserPlus },
  contacted: { label: 'Contactado', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  qualified: { label: 'Calificado', color: 'bg-purple-100 text-purple-700', icon: TrendingUp },
  converted: { label: 'Convertido', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  lost: { label: 'Perdido', color: 'bg-red-100 text-red-700', icon: XCircle }
};

export default function CRMLeadsView({ searchTerm, onRefresh, lawyerData }: Props) {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    lost: 0
  });

  useEffect(() => {
    fetchLeads();
  }, [lawyerData.id]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('lawyer_id', lawyerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLeads((data || []) as Lead[]);
      
      // Calculate stats
      const newStats = {
        total: data?.length || 0,
        new: data?.filter(l => l.status === 'new').length || 0,
        contacted: data?.filter(l => l.status === 'contacted').length || 0,
        qualified: data?.filter(l => l.status === 'qualified').length || 0,
        converted: data?.filter(l => l.status === 'converted').length || 0,
        lost: data?.filter(l => l.status === 'lost').length || 0
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los leads",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: "El estado del lead ha sido actualizado",
      });

      fetchLeads();
      onRefresh();
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive"
      });
    }
  };

  const convertToClient = async (lead: Lead) => {
    try {
      // Create client from lead
      const { error: clientError } = await supabase
        .from('crm_clients')
        .insert({
          lawyer_id: lawyerData.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          client_type: 'individual',
          status: 'active',
          notes: `Convertido desde lead. Mensaje inicial: ${lead.message}`
        });

      if (clientError) throw clientError;

      // Update lead status
      await updateLeadStatus(lead.id, 'converted');

      toast({
        title: "Lead convertido",
        description: "El lead ha sido convertido a cliente exitosamente",
      });
    } catch (error) {
      console.error('Error converting lead:', error);
      toast({
        title: "Error",
        description: "No se pudo convertir el lead a cliente",
        variant: "destructive"
      });
    }
  };

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <UserPlus className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{stats.new}</p>
              <p className="text-xs text-muted-foreground">Nuevos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
              <p className="text-2xl font-bold">{stats.contacted}</p>
              <p className="text-xs text-muted-foreground">Contactados</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold">{stats.qualified}</p>
              <p className="text-xs text-muted-foreground">Calificados</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold">{stats.converted}</p>
              <p className="text-xs text-muted-foreground">Convertidos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-8 w-8 mx-auto text-red-600 mb-2" />
              <p className="text-2xl font-bold">{stats.lost}</p>
              <p className="text-xs text-muted-foreground">Perdidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Prospectos</CardTitle>
          <CardDescription>
            Leads que llegaron a través de tu página de perfil público
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron leads' : 'No tienes leads aún'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const StatusIcon = statusConfig[lead.status].icon;
                    return (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </div>
                            {lead.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig[lead.status].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[lead.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{lead.origin}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(lead.created_at), 'dd MMM yyyy', { locale: es })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedLead(lead)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Detalles del Lead</DialogTitle>
                                  <DialogDescription>
                                    Información completa del prospecto
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedLead && (
                                  <div className="space-y-4">
                                    <div>
                                      <Label className="text-sm font-medium">Nombre</Label>
                                      <p className="text-base">{selectedLead.name}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Email</Label>
                                      <p className="text-base">{selectedLead.email}</p>
                                    </div>
                                    {selectedLead.phone && (
                                      <div>
                                        <Label className="text-sm font-medium">Teléfono</Label>
                                        <p className="text-base">{selectedLead.phone}</p>
                                      </div>
                                    )}
                                    <div>
                                      <Label className="text-sm font-medium">Mensaje</Label>
                                      <Card className="mt-2">
                                        <CardContent className="pt-4">
                                          <p className="whitespace-pre-wrap">{selectedLead.message}</p>
                                        </CardContent>
                                      </Card>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Estado actual</Label>
                                      <Select 
                                        value={selectedLead.status}
                                        onValueChange={(value) => updateLeadStatus(selectedLead.id, value)}
                                      >
                                        <SelectTrigger className="w-full mt-2">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Object.entries(statusConfig).map(([key, config]) => (
                                            <SelectItem key={key} value={key}>
                                              {config.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {selectedLead.status !== 'converted' && (
                                      <Button 
                                        className="w-full bg-gradient-to-r from-green-500 to-green-600"
                                        onClick={() => convertToClient(selectedLead)}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Convertir a Cliente
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}