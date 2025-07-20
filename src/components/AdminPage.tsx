import { useState, useEffect } from "react";
import { supabase } from "../integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import { toast } from "@/hooks/use-toast";
import NativeAdminLogin from "./NativeAdminLogin";
import { useNativeAdminAuth } from "../hooks/useNativeAdminAuth";
import LawyerStatsAdmin from "./LawyerStatsAdmin";
import OpenAIAgentManager from "./OpenAIAgentManager";
import LawyerBlogManager from "./LawyerBlogManager";
import SystemConfigManager from "./SystemConfigManager";
import { Copy, Users, Bot, BarChart3, Clock, CheckCircle, Lock, Unlock, Trash2, Check, X, Plus, Loader2, MessageCircle, BookOpen, Settings, Zap, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Label } from "./ui/label";

interface Lawyer {
  id: string;
  name: string;
  email: string;
  created_at: string;
  is_verified: boolean;
  verification_token?: string;
  can_create_agents: boolean;
  can_see_business_stats: boolean;
  is_locked: boolean;
  lock_reason?: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
  created_at: string;
  is_read: boolean;
  status: 'pending' | 'responded' | 'archived';
  admin_notes?: string;
  responded_at?: string;
}

function AdminPage() {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [tokenRequests, setTokenRequests] = useState<any[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [pendingAgentsCount, setPendingAgentsCount] = useState(0);
  const [pendingBlogsCount, setPendingBlogsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [newLawyer, setNewLawyer] = useState({
    name: "",
    email: "",
    phone: "",
    canCreateAgents: false,
    canSeeBusinessStats: false
  });

  const { isAuthenticated, isLoading: authLoading, user, session, getAuthHeaders } = useNativeAdminAuth();

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadData();
    }
    setIsLoading(authLoading);
  }, [isAuthenticated, authLoading]);

  const handleLoginSuccess = () => {
    // This will trigger the useEffect to reload data
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadLawyers(),
        loadAgents(),
        loadTokenRequests(),
        loadContactMessages()
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos del administrador",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadLawyers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-lawyers-admin');
      if (error) throw error;
      setLawyers(data || []);
    } catch (error) {
      console.error('Error loading lawyers:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-agents-admin');
      if (error) throw error;
      setAgents(data || []);
      
      const pending = data?.filter((agent: any) => agent.status === 'pending_review').length || 0;
      setPendingAgentsCount(pending);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadTokenRequests = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-token-requests');
      if (error) throw error;
      setTokenRequests(data || []);
    } catch (error) {
      console.error('Error loading token requests:', error);
    }
  };

  const loadContactMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContactMessages(data as ContactMessage[] || []);
      
      const unread = data?.filter(msg => !msg.is_read).length || 0;
      setUnreadMessagesCount(unread);
    } catch (error) {
      console.error('Error loading contact messages:', error);
    }
  };

  const createLawyer = async () => {
    try {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke('create-lawyer', {
        headers: getAuthHeaders(),
        body: {
          name: newLawyer.name,
          email: newLawyer.email,
          phone_number: newLawyer.phone,
          canCreateAgents: newLawyer.canCreateAgents,
          canSeeBusinessStats: newLawyer.canSeeBusinessStats
        }
      });

      if (error) throw error;

      setNewLawyer({ 
        name: "", 
        email: "", 
        phone: "", 
        canCreateAgents: false, 
        canSeeBusinessStats: false 
      });
      await loadLawyers();
      
      toast({
        title: "Abogado creado",
        description: `${newLawyer.name} ha sido creado exitosamente`,
      });
    } catch (error: any) {
      console.error('Error creating lawyer:', error);
      toast({
        title: "Error al crear abogado",
        description: error.message || "Error desconocido al crear el abogado",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyLawyerToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({
      title: "Token copiado",
      description: "El token del abogado ha sido copiado al portapapeles",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <NativeAdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Panel de Administración</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestiona abogados, agentes y configuración del sistema</p>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {unreadMessagesCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                <MessageCircle className="w-3 h-3 mr-1" />
                {unreadMessagesCount} msg
              </Badge>
            )}
            {pendingAgentsCount > 0 && (
              <Badge variant="outline" className="text-xs">
                <Bot className="w-3 h-3 mr-1" />
                {pendingAgentsCount} pending
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="lawyers" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto gap-1 p-1">
            <TabsTrigger value="lawyers" className="flex items-center gap-1 text-xs p-2">
              <Users className="w-3 h-3" />
              <span className="hidden sm:inline">Abogados</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-1 text-xs p-2">
              <Clock className="w-3 h-3" />
              <span className="hidden sm:inline">Solicitudes</span>
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-1 text-xs p-2">
              <Bot className="w-3 h-3" />
              <span className="hidden sm:inline">Agentes</span>
            </TabsTrigger>
            <TabsTrigger value="openai" className="flex items-center gap-1 text-xs p-2">
              <Zap className="w-3 h-3" />
              <span className="hidden sm:inline">OpenAI</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1 text-xs p-2">
              <BarChart3 className="w-3 h-3" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="blogs" className="flex items-center gap-1 text-xs p-2">
              <BookOpen className="w-3 h-3" />
              <span className="hidden sm:inline">Blog</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-1 text-xs p-2">
              <Settings className="w-3 h-3" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-1 text-xs p-2">
              <MessageCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Mensajes</span>
              {unreadMessagesCount > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {unreadMessagesCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lawyers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Gestión de Abogados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 border rounded-lg">
                  <Input
                    placeholder="Nombre completo"
                    value={newLawyer.name}
                    onChange={(e) => setNewLawyer(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={newLawyer.email}
                    onChange={(e) => setNewLawyer(prev => ({ ...prev, email: e.target.value }))}
                  />
                  <Input
                    placeholder="Teléfono (opcional)"
                    value={newLawyer.phone || ''}
                    onChange={(e) => setNewLawyer(prev => ({ ...prev, phone: e.target.value }))}
                  />
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newLawyer.canCreateAgents}
                      onCheckedChange={(checked) => setNewLawyer(prev => ({ ...prev, canCreateAgents: checked }))}
                    />
                    <Label className="text-xs">Crear Agentes</Label>
                  </div>
                  <Button 
                    onClick={createLawyer} 
                    disabled={!newLawyer.name || !newLawyer.email || isProcessing}
                    className="lg:col-span-5"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Crear Abogado
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Abogado</TableHead>
                        <TableHead className="hidden sm:table-cell">Contacto</TableHead>
                        <TableHead className="hidden md:table-cell">Permisos</TableHead>
                        <TableHead className="hidden lg:table-cell">Actividad</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lawyers.map((lawyer) => (
                        <TableRow key={lawyer.id} className={!(lawyer as any).active ? 'opacity-60' : ''}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="flex items-center gap-2">
                                {(lawyer as any).full_name || lawyer.name}
                                {lawyer.can_create_agents && (
                                  <Badge variant="outline" className="text-xs">
                                    <Bot className="w-3 h-3 mr-1" />
                                    Agentes
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground sm:hidden">
                                {lawyer.email}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="hidden sm:table-cell">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs">
                                <Mail className="w-3 h-3" />
                                {lawyer.email}
                              </div>
                              {(lawyer as any).phone_number && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="w-3 h-3" />
                                  {(lawyer as any).phone_number}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell className="hidden md:table-cell">
                            <div className="space-y-1">
                              <Badge variant={lawyer.can_create_agents ? 'default' : 'secondary'} className="text-xs">
                                {lawyer.can_create_agents ? 'Puede crear agentes' : 'Solo consulta'}
                              </Badge>
                              {lawyer.can_see_business_stats && (
                                <Badge variant="outline" className="text-xs">
                                  Ver estadísticas
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell className="hidden lg:table-cell">
                            <div className="text-xs">
                              {(lawyer as any).last_login_at ? (
                                <>
                                  <div>{format(new Date((lawyer as any).last_login_at), 'dd/MM/yyyy', { locale: es })}</div>
                                  <div className="text-muted-foreground">
                                    {format(new Date((lawyer as any).last_login_at), 'HH:mm', { locale: es })}
                                  </div>
                                </>
                              ) : (
                                <span className="text-muted-foreground">Nunca</span>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={(lawyer as any).active !== false ? 'default' : 'secondary'} className="text-xs">
                                {(lawyer as any).active !== false ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Activo
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3 mr-1" />
                                    Inactivo
                                  </>
                                )}
                              </Badge>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyLawyerToken((lawyer as any).access_token || (lawyer as any).verification_token)}
                                title="Copiar token"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              
                              <Button
                                size="sm"
                                variant={(lawyer as any).active !== false ? "outline" : "default"}
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('lawyer_tokens')
                                      .update({ active: !(lawyer as any).active })
                                      .eq('lawyer_id', (lawyer as any).lawyer_id || lawyer.id);
                                    
                                    if (error) throw error;
                                    await loadLawyers();
                                    
                                    toast({
                                      title: (lawyer as any).active ? "Abogado desactivado" : "Abogado activado",
                                      description: `El abogado ha sido ${(lawyer as any).active ? 'desactivado' : 'activado'} exitosamente`,
                                    });
                                  } catch (error: any) {
                                    toast({
                                      title: "Error",
                                      description: error.message || "Error al cambiar el estado del abogado",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                title={(lawyer as any).active ? "Desactivar" : "Activar"}
                              >
                                {(lawyer as any).active ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  const lawyerName = (lawyer as any).full_name || lawyer.name;
                                  if (!confirm(`¿Estás seguro de que deseas eliminar al abogado "${lawyerName}"?`)) return;
                                  
                                  try {
                                    const { data, error } = await supabase.functions.invoke('delete-lawyer', {
                                      headers: getAuthHeaders(),
                                      body: { lawyerId: (lawyer as any).lawyer_id || lawyer.id }
                                    });

                                    if (error) throw error;

                                    toast({
                                      title: "Abogado eliminado",
                                      description: `${lawyerName} ha sido eliminado exitosamente`,
                                    });

                                    await loadLawyers();
                                  } catch (error: any) {
                                    toast({
                                      title: "Error",
                                      description: error.message || "Error al eliminar el abogado",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Solicitudes de Token de Abogados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead className="hidden md:table-cell">Empresa</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tokenRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{request.full_name}</div>
                              <div className="text-xs text-muted-foreground sm:hidden">{request.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{request.email}</TableCell>
                          <TableCell className="hidden md:table-cell">{request.law_firm || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={
                              request.status === 'approved' ? 'default' :
                              request.status === 'rejected' ? 'destructive' : 'outline'
                            }>
                              {request.status === 'approved' ? 'Aprobado' :
                               request.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {request.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const { data, error } = await supabase.functions.invoke('manage-token-request', {
                                          body: {
                                            action: 'approve',
                                            requestId: request.id
                                          }
                                        });
                                        if (error) throw error;
                                        await loadTokenRequests();
                                        toast({
                                          title: "Solicitud aprobada",
                                          description: "El token de abogado ha sido generado",
                                        });
                                      } catch (error: any) {
                                        toast({
                                          title: "Error",
                                          description: error.message || "Error al aprobar la solicitud",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={async () => {
                                      const reason = prompt('Razón del rechazo:');
                                      if (!reason) return;
                                      try {
                                        const { data, error } = await supabase.functions.invoke('manage-token-request', {
                                          body: {
                                            action: 'reject',
                                            requestId: request.id,
                                            rejectionReason: reason
                                          }
                                        });
                                        if (error) throw error;
                                        await loadTokenRequests();
                                        toast({
                                          title: "Solicitud rechazada",
                                          description: "La solicitud ha sido rechazada",
                                        });
                                      } catch (error: any) {
                                        toast({
                                          title: "Error",
                                          description: error.message || "Error al rechazar la solicitud",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Gestión de Agentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="hidden sm:table-cell">Documento</TableHead>
                        <TableHead className="hidden md:table-cell">Categoría</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agents.map((agent) => (
                        <TableRow key={agent.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{agent.name}</div>
                              <div className="text-xs text-muted-foreground sm:hidden">{agent.document_name}</div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{agent.document_name}</TableCell>
                          <TableCell className="hidden md:table-cell">{agent.category}</TableCell>
                          <TableCell>
                            <Badge variant={
                              agent.status === 'approved' ? 'default' :
                              agent.status === 'rejected' ? 'destructive' : 'outline'
                            }>
                              {agent.status === 'approved' ? 'Aprobado' :
                               agent.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {agent.status === 'pending_review' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const { error } = await supabase.functions.invoke('update-agent', {
                                          body: {
                                            agentId: agent.id,
                                            status: 'approved'
                                          }
                                        });
                                        if (error) throw error;
                                        await loadAgents();
                                        toast({
                                          title: "Agente aprobado",
                                          description: "El agente ha sido aprobado exitosamente",
                                        });
                                      } catch (error: any) {
                                        toast({
                                          title: "Error",
                                          description: error.message || "Error al aprobar el agente",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={async () => {
                                      const reason = prompt('Razón del rechazo:');
                                      if (!reason) return;
                                      try {
                                        const { error } = await supabase.functions.invoke('update-agent', {
                                          body: {
                                            agentId: agent.id,
                                            status: 'rejected',
                                            rejectionReason: reason
                                          }
                                        });
                                        if (error) throw error;
                                        await loadAgents();
                                        toast({
                                          title: "Agente rechazado",
                                          description: "El agente ha sido rechazado",
                                        });
                                      } catch (error: any) {
                                        toast({
                                          title: "Error",
                                          description: error.message || "Error al rechazar el agente",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="openai">
            <OpenAIAgentManager />
          </TabsContent>

          <TabsContent value="stats">
            <LawyerStatsAdmin 
              authHeaders={{
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
              }}
              viewMode="global"
            />
          </TabsContent>

          <TabsContent value="blogs">
            <LawyerBlogManager 
              onBack={() => {}}
              lawyerData={user}
            />
          </TabsContent>

          <TabsContent value="config">
            <SystemConfigManager />
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Mensajes de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead className="hidden md:table-cell">Tipo</TableHead>
                        <TableHead className="hidden lg:table-cell">Mensaje</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contactMessages.map((message) => (
                        <TableRow key={message.id} className={!message.is_read ? 'bg-blue-50 dark:bg-blue-950/10' : ''}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="flex items-center gap-2">
                                {message.name}
                                {!message.is_read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground sm:hidden">{message.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{message.email}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline" className="text-xs">
                              {(message as any).consultation_type || 'General'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell max-w-xs">
                            <div className="truncate" title={message.message}>
                              {message.message.length > 100 
                                ? `${message.message.substring(0, 100)}...` 
                                : message.message
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              message.status === 'responded' ? 'default' :
                              message.status === 'archived' ? 'secondary' : 'outline'
                            }>
                              {message.status === 'responded' ? 'Respondido' :
                               message.status === 'archived' ? 'Archivado' : 'Pendiente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {!message.is_read && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabase
                                        .from('contact_messages')
                                        .update({ is_read: true })
                                        .eq('id', message.id);
                                      
                                      if (error) throw error;
                                      await loadContactMessages();
                                      
                                      toast({
                                        title: "Mensaje marcado como leído",
                                        description: "El mensaje ha sido marcado como leído",
                                      });
                                    } catch (error: any) {
                                      toast({
                                        title: "Error",
                                        description: error.message || "Error al marcar como leído",
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                  title="Marcar como leído"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                </Button>
                              )}
                              {message.status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    const response = prompt('Respuesta al mensaje:');
                                    if (!response) return;
                                    try {
                                      const { error } = await supabase
                                        .from('contact_messages')
                                        .update({ 
                                          status: 'responded', 
                                          is_read: true,
                                          responded_at: new Date().toISOString(),
                                          admin_notes: response
                                        })
                                        .eq('id', message.id);
                                      
                                      if (error) throw error;
                                      await loadContactMessages();
                                      
                                      toast({
                                        title: "Mensaje respondido",
                                        description: "El mensaje ha sido marcado como respondido",
                                      });
                                    } catch (error: any) {
                                      toast({
                                        title: "Error",
                                        description: error.message || "Error al responder mensaje",
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                  title="Responder mensaje"
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  if (!confirm('¿Estás seguro de que deseas archivar este mensaje?')) return;
                                  try {
                                    const { error } = await supabase
                                      .from('contact_messages')
                                      .update({ status: 'archived', is_read: true })
                                      .eq('id', message.id);
                                    
                                    if (error) throw error;
                                    await loadContactMessages();
                                    
                                    toast({
                                      title: "Mensaje archivado",
                                      description: "El mensaje ha sido archivado",
                                    });
                                  } catch (error: any) {
                                    toast({
                                      title: "Error",
                                      description: error.message || "Error al archivar mensaje",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                title="Archivar mensaje"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default AdminPage;