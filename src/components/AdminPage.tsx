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
import AdminLogin from "./AdminLogin";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { Copy, Users, Bot, BarChart3, Clock, CheckCircle, Lock, Unlock, Trash2, Check, X, Plus, Loader2, MessageCircle, BookOpen, Settings, Zap } from "lucide-react";
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
    canCreateAgents: false,
    canSeeBusinessStats: false
  });

  const { isAuthenticated, isLoading: authLoading, user } = useAdminAuth();

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
        body: {
          name: newLawyer.name,
          email: newLawyer.email,
          canCreateAgents: newLawyer.canCreateAgents,
          canSeeBusinessStats: newLawyer.canSeeBusinessStats
        }
      });

      if (error) throw error;

      setNewLawyer({ name: "", email: "", canCreateAgents: false, canSeeBusinessStats: false });
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
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg">
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
                    className="md:col-span-2 lg:col-span-4"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Crear Abogado
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead className="hidden md:table-cell">Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lawyers.map((lawyer) => (
                        <TableRow key={lawyer.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{lawyer.name}</div>
                              <div className="text-xs text-muted-foreground sm:hidden">{lawyer.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{lawyer.email}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {lawyer.is_verified ? (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verificado
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Pendiente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {lawyer.verification_token && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyLawyerToken(lawyer.verification_token!)}
                                className="text-xs"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            )}
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
                <CardTitle>Solicitudes de Token</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Funcionalidad disponible próximamente.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Agentes</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Funcionalidad disponible próximamente.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="openai">
            <Card>
              <CardHeader>
                <CardTitle>Configuración OpenAI</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Configuración disponible próximamente.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Estadísticas disponibles próximamente.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blogs">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Blog</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Gestión de blog disponible próximamente.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Configuración disponible próximamente.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Mensajes de Contacto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead className="hidden md:table-cell">Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contactMessages.map((message) => (
                        <TableRow key={message.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{message.name}</div>
                              <div className="text-xs text-muted-foreground sm:hidden">{message.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{message.email}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {format(new Date(message.created_at), 'dd/MM/yyyy', { locale: es })}
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