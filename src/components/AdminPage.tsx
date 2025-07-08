import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Users, FileText, Shield, Plus, Edit, Check, X } from "lucide-react";

interface Lawyer {
  id: string;
  email: string;
  full_name: string;
  active: boolean;
  can_create_agents: boolean;
  is_admin: boolean;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  suggested_price: number;
  created_by: string;
  created_at: string;
  lawyer_accounts?: {
    full_name: string;
    email: string;
  };
}

export default function AdminPage() {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const { toast } = useToast();

  // New lawyer form state
  const [newLawyer, setNewLawyer] = useState({
    email: "",
    full_name: "",
    access_token: "",
    can_create_agents: false,
    is_admin: false
  });

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setAdminToken(token);
      await verifyAdminAccess(token);
    }
    setLoading(false);
  };

  const verifyAdminAccess = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('lawyer_accounts')
        .select('*')
        .eq('access_token', token)
        .eq('is_admin', true)
        .single();

      if (error || !data) {
        setIsAuthenticated(false);
        localStorage.removeItem('admin_token');
        return;
      }

      setIsAuthenticated(true);
      await loadData();
    } catch (error) {
      setIsAuthenticated(false);
      localStorage.removeItem('admin_token');
    }
  };

  const handleLogin = async () => {
    if (!adminToken.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa el token de administrador",
        variant: "destructive"
      });
      return;
    }

    await verifyAdminAccess(adminToken);
    if (isAuthenticated) {
      localStorage.setItem('admin_token', adminToken);
      toast({
        title: "Éxito",
        description: "Acceso administrativo verificado",
      });
    } else {
      toast({
        title: "Error",
        description: "Token de administrador inválido",
        variant: "destructive"
      });
    }
  };

  const loadData = async () => {
    try {
      // Load lawyers
      const { data: lawyersData, error: lawyersError } = await supabase
        .from('lawyer_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (lawyersError) throw lawyersError;
      setLawyers(lawyersData || []);

      // Load agents with lawyer info
      const { data: agentsData, error: agentsError } = await supabase
        .from('legal_agents')
        .select(`
          *,
          lawyer_accounts:created_by (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (agentsError) throw agentsError;
      setAgents(agentsData || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar los datos",
        variant: "destructive"
      });
    }
  };

  const createLawyer = async () => {
    if (!newLawyer.email || !newLawyer.full_name || !newLawyer.access_token) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('lawyer_accounts')
        .insert([{
          email: newLawyer.email,
          full_name: newLawyer.full_name,
          access_token: newLawyer.access_token,
          can_create_agents: newLawyer.can_create_agents,
          is_admin: newLawyer.is_admin
        }]);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Abogado creado exitosamente",
      });

      setNewLawyer({
        email: "",
        full_name: "",
        access_token: "",
        can_create_agents: false,
        is_admin: false
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al crear el abogado",
        variant: "destructive"
      });
    }
  };

  const updateLawyerPermissions = async (lawyerId: string, field: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('lawyer_accounts')
        .update({ [field]: value })
        .eq('id', lawyerId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Permisos actualizados exitosamente",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar permisos",
        variant: "destructive"
      });
    }
  };

  const updateAgentStatus = async (agentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('legal_agents')
        .update({ status })
        .eq('id', agentId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Estado del agente actualizado exitosamente",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el estado del agente",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Borrador", variant: "secondary" as const },
      pending_review: { label: "En Revisión", variant: "outline" as const },
      active: { label: "Activo", variant: "default" as const },
      suspended: { label: "Suspendido", variant: "destructive" as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center gap-2 justify-center">
              <Shield className="h-6 w-6 text-primary" />
              Administración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token de Administrador</Label>
              <Input
                id="token"
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="Ingresa tu token de administrador"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              Acceder
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Panel de Administración</h1>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsAuthenticated(false);
              localStorage.removeItem('admin_token');
              setAdminToken("");
            }}
          >
            Cerrar Sesión
          </Button>
        </div>

        <Tabs defaultValue="lawyers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lawyers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gestión de Abogados
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Gestión de Agentes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lawyers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Crear Nuevo Abogado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newLawyer.email}
                      onChange={(e) => setNewLawyer({ ...newLawyer, email: e.target.value })}
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nombre Completo</Label>
                    <Input
                      id="fullName"
                      value={newLawyer.full_name}
                      onChange={(e) => setNewLawyer({ ...newLawyer, full_name: e.target.value })}
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accessToken">Token de Acceso</Label>
                    <Input
                      id="accessToken"
                      value={newLawyer.access_token}
                      onChange={(e) => setNewLawyer({ ...newLawyer, access_token: e.target.value })}
                      placeholder="TOKEN_UNICO"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="canCreateAgents"
                        checked={newLawyer.can_create_agents}
                        onCheckedChange={(checked) => setNewLawyer({ ...newLawyer, can_create_agents: checked })}
                      />
                      <Label htmlFor="canCreateAgents">Puede crear agentes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isAdmin"
                        checked={newLawyer.is_admin}
                        onCheckedChange={(checked) => setNewLawyer({ ...newLawyer, is_admin: checked })}
                      />
                      <Label htmlFor="isAdmin">Es administrador</Label>
                    </div>
                  </div>
                </div>
                <Button onClick={createLawyer} className="w-full md:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Abogado
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Abogados Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Crear Agentes</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Fecha Registro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lawyers.map((lawyer) => (
                      <TableRow key={lawyer.id}>
                        <TableCell className="font-medium">{lawyer.full_name}</TableCell>
                        <TableCell>{lawyer.email}</TableCell>
                        <TableCell>
                          <Switch
                            checked={lawyer.active}
                            onCheckedChange={(checked) => updateLawyerPermissions(lawyer.id, 'active', checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={lawyer.can_create_agents}
                            onCheckedChange={(checked) => updateLawyerPermissions(lawyer.id, 'can_create_agents', checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={lawyer.is_admin}
                            onCheckedChange={(checked) => updateLawyerPermissions(lawyer.id, 'is_admin', checked)}
                          />
                        </TableCell>
                        <TableCell>{new Date(lawyer.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Agentes Para Revisión</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Creado por</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">{agent.name}</TableCell>
                        <TableCell>{agent.category}</TableCell>
                        <TableCell>
                          {agent.lawyer_accounts?.full_name || 'N/A'}
                          <br />
                          <span className="text-sm text-muted-foreground">
                            {agent.lawyer_accounts?.email || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(agent.status)}</TableCell>
                        <TableCell>${agent.suggested_price.toLocaleString()}</TableCell>
                        <TableCell>{new Date(agent.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {agent.status === 'pending_review' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => updateAgentStatus(agent.id, 'active')}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateAgentStatus(agent.id, 'suspended')}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {agent.status === 'active' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateAgentStatus(agent.id, 'suspended')}
                              >
                                Suspender
                              </Button>
                            )}
                            {agent.status === 'suspended' && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => updateAgentStatus(agent.id, 'active')}
                              >
                                Activar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}