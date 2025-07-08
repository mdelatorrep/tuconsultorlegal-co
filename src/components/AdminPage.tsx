import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import AdminLogin from "./AdminLogin";
import { Users, FileText, Shield, Plus, Check, X, BarChart3, TrendingUp, DollarSign, Activity, LogOut, Unlock, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import DOMPurify from 'dompurify';

interface Lawyer {
  id: string;
  email: string;
  full_name: string;
  active: boolean;
  can_create_agents: boolean;
  is_admin: boolean;
  created_at: string;
  failed_login_attempts?: number;
  locked_until?: string;
  last_login_at?: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  suggested_price: number;
  final_price: number | null;
  created_by: string;
  created_at: string;
  lawyer_accounts?: {
    full_name: string;
    email: string;
  };
}

interface LawyerStats {
  lawyer_id: string;
  lawyer_name: string;
  contracts_count: number;
  total_value: number;
  agents_created: number;
  active_agents: number;
}

interface BusinessStats {
  total_lawyers: number;
  total_agents: number;
  active_agents: number;
  total_contracts: number;
  total_revenue: number;
  monthly_growth: number;
}

interface ContractDetail {
  id: string;
  document_type: string;
  price: number;
  status: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export default function AdminPage() {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [lawyerStats, setLawyerStats] = useState<LawyerStats[]>([]);
  const [businessStats, setBusinessStats] = useState<BusinessStats | null>(null);
  const [contracts, setContracts] = useState<ContractDetail[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user, logout, getAuthHeaders } = useAdminAuth();

  // New lawyer form state with input validation
  const [newLawyer, setNewLawyer] = useState({
    email: "",
    full_name: "",
    password: "",
    can_create_agents: false,
    is_admin: false
  });

  // New agent form state
  const [newAgent, setNewAgent] = useState({
    name: "",
    description: "",
    category: "",
    ai_prompt: "",
    suggested_price: 0,
    frontend_icon: "FileText",
    document_name: "",
    document_description: "",
    button_cta: "Generar Documento",
    target_audience: "personas"
  });

  useEffect(() => {
    console.log('AdminPage useEffect - isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      console.log('User authenticated, loading data...');
      loadData();
    }
  }, [isAuthenticated]);

  const sanitizeInput = (input: string): string => {
    return DOMPurify.sanitize(input.trim());
  };

  const handleLoginSuccess = () => {
    console.log('handleLoginSuccess called');
    // Force re-check of authentication status
    setTimeout(() => {
      console.log('Loading data after login success...');
      loadData();
    }, 100);
  };

  const loadData = async () => {
    try {
      // Load data with proper authentication headers
      const authHeaders = getAuthHeaders();
      
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
          lawyer_accounts!created_by (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (agentsError) throw agentsError;
      setAgents(agentsData || []);

      // Load statistics
      await loadStatistics(lawyersData || [], agentsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos",
        variant: "destructive"
      });
    }
  };

  const loadStatistics = async (lawyersData: Lawyer[], agentsData: Agent[]) => {
    try {
      // Load contracts
      const { data: contractsData, error: contractsError } = await supabase
        .from('document_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (contractsError) throw contractsError;
      setContracts(contractsData || []);

      // Calculate business statistics
      const totalRevenue = contractsData?.reduce((sum, c) => sum + c.price, 0) || 0;
      const monthlyGrowth = calculateMonthlyGrowth(contractsData || []);
      
      const businessStatsData: BusinessStats = {
        total_lawyers: lawyersData.length,
        total_agents: agentsData.length,
        active_agents: agentsData.filter(a => a.status === 'active').length,
        total_contracts: contractsData?.length || 0,
        total_revenue: totalRevenue,
        monthly_growth: monthlyGrowth
      };
      setBusinessStats(businessStatsData);

      // Generate monthly data for charts
      const monthlyStats = generateMonthlyDataFromContracts(contractsData || [], lawyersData);
      setMonthlyData(monthlyStats);

      // Calculate lawyer statistics
      const statsPromises = lawyersData.map(async (lawyer) => {
        const agentsByLawyer = agentsData.filter(a => a.created_by === lawyer.id);
        
        const contractsCount = contractsData?.filter(c => 
          agentsByLawyer?.some(a => a.name.toLowerCase().includes(c.document_type.toLowerCase()))
        ).length || 0;

        const totalValue = contractsData?.filter(c => 
          agentsByLawyer?.some(a => a.name.toLowerCase().includes(c.document_type.toLowerCase()))
        ).reduce((sum, c) => sum + c.price, 0) || 0;

        return {
          lawyer_id: lawyer.id,
          lawyer_name: lawyer.full_name,
          contracts_count: contractsCount,
          total_value: totalValue,
          agents_created: agentsByLawyer?.length || 0,
          active_agents: agentsByLawyer?.filter(a => a.status === 'active').length || 0
        };
      });

      const statsResults = await Promise.all(statsPromises);
      setLawyerStats(statsResults);

    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const calculateMonthlyGrowth = (contracts: ContractDetail[]) => {
    if (contracts.length === 0) return 0;
    
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const currentMonthContracts = contracts.filter(c => 
      new Date(c.created_at) >= currentMonth
    );
    
    const lastMonthContracts = contracts.filter(c => {
      const contractDate = new Date(c.created_at);
      return contractDate >= lastMonth && contractDate < currentMonth;
    });
    
    if (lastMonthContracts.length === 0) return 100;
    
    const growth = ((currentMonthContracts.length - lastMonthContracts.length) / lastMonthContracts.length) * 100;
    return Math.round(growth * 10) / 10;
  };

  const generateMonthlyDataFromContracts = (contracts: ContractDetail[], lawyersData: Lawyer[]) => {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
      
      const monthContracts = contracts.filter(c => {
        const contractDate = new Date(c.created_at);
        return contractDate >= monthDate && contractDate < nextMonthDate;
      });
      
      const monthRevenue = monthContracts.reduce((sum, c) => sum + c.price, 0);
      
      last6Months.push({
        month: monthNames[monthDate.getMonth()],
        contratos: monthContracts.length,
        ingresos: monthRevenue,
        abogados: lawyersData.length
      });
    }
    
    return last6Months;
  };

  const createLawyer = async () => {
    // Input validation and sanitization
    const sanitizedEmail = sanitizeInput(newLawyer.email).toLowerCase();
    const sanitizedName = sanitizeInput(newLawyer.full_name);
    const sanitizedPassword = sanitizeInput(newLawyer.password);

    if (!sanitizedEmail || !sanitizedName || !sanitizedPassword) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive"
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      toast({
        title: "Error",
        description: "Formato de email inválido",
        variant: "destructive"
      });
      return;
    }

    try {
      // Hash password securely on backend
      const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password', {
        password: sanitizedPassword
      });

      if (hashError) throw hashError;

      const { error } = await supabase
        .from('lawyer_accounts')
        .insert([{
          email: sanitizedEmail,
          full_name: sanitizedName,
          password_hash: hashedPassword,
          access_token: crypto.randomUUID(), // Generate secure session token
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
        password: "",
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

  const unlockLawyerAccount = async (lawyerId: string) => {
    try {
      const { error } = await supabase
        .from('lawyer_accounts')
        .update({ 
          failed_login_attempts: 0,
          locked_until: null 
        })
        .eq('id', lawyerId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Cuenta desbloqueada exitosamente",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al desbloquear la cuenta",
        variant: "destructive"
      });
    }
  };

  const isAccountLocked = (lawyer: Lawyer): boolean => {
    if (!lawyer.locked_until) return false;
    return new Date(lawyer.locked_until) > new Date();
  };

  const getLockStatusBadge = (lawyer: Lawyer) => {
    if (isAccountLocked(lawyer)) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Bloqueada
        </Badge>
      );
    }
    if (lawyer.failed_login_attempts && lawyer.failed_login_attempts > 0) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {lawyer.failed_login_attempts} intentos
        </Badge>
      );
    }
    return <Badge variant="secondary">Normal</Badge>;
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

  const updateAgentFinalPrice = async (agentId: string, finalPrice: number) => {
    try {
      const { error } = await supabase
        .from('legal_agents')
        .update({ 
          final_price: finalPrice,
          price_approved_by: user?.id,
          price_approved_at: new Date().toISOString()
        })
        .eq('id', agentId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Precio final actualizado exitosamente",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el precio final",
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

  console.log('AdminPage render - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
  
  if (!isAuthenticated) {
    console.log('Not authenticated, showing login page');
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Panel de Administración</h1>
              <p className="text-muted-foreground">Bienvenido, {user?.name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>

        <Tabs defaultValue="lawyers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lawyers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gestión de Abogados
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Gestión de Agentes
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Estadísticas
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
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newLawyer.password}
                      onChange={(e) => setNewLawyer({ ...newLawyer, password: e.target.value })}
                      placeholder="Contraseña segura"
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
                      <TableHead>Seguridad</TableHead>
                      <TableHead>Crear Agentes</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Último Login</TableHead>
                      <TableHead>Acciones</TableHead>
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
                          {getLockStatusBadge(lawyer)}
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
                        <TableCell>
                          {lawyer.last_login_at 
                            ? new Date(lawyer.last_login_at).toLocaleDateString()
                            : 'Nunca'
                          }
                        </TableCell>
                        <TableCell>
                          {isAccountLocked(lawyer) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => unlockLawyerAccount(lawyer.id)}
                              className="flex items-center gap-1"
                            >
                              <Unlock className="h-3 w-3" />
                              Desbloquear
                            </Button>
                          )}
                        </TableCell>
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
                        <TableCell className="font-medium">{sanitizeInput(agent.name)}</TableCell>
                        <TableCell>{sanitizeInput(agent.category)}</TableCell>
                        <TableCell>
                          {agent.lawyer_accounts?.full_name || 'N/A'}
                          <br />
                          <span className="text-sm text-muted-foreground">
                            {agent.lawyer_accounts?.email || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(agent.status)}</TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                              Sugerido: ${agent.suggested_price.toLocaleString()}
                            </div>
                            {agent.final_price ? (
                              <div className="font-medium text-success">
                                Final: ${agent.final_price.toLocaleString()}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  placeholder="Precio final"
                                  className="w-24 h-8"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const value = parseInt((e.target as HTMLInputElement).value);
                                      if (value > 0) {
                                        updateAgentFinalPrice(agent.id, value);
                                      }
                                    }
                                  }}
                                />
                                <span className="text-xs text-muted-foreground">Enter</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
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

          <TabsContent value="stats" className="space-y-6">
            {/* Business Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Abogados</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{businessStats?.total_lawyers || 0}</div>
                  <p className="text-xs text-muted-foreground">Registro total</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Agentes Activos</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{businessStats?.active_agents || 0}</div>
                  <p className="text-xs text-muted-foreground">de {businessStats?.total_agents || 0} totales</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Contratos</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{businessStats?.total_contracts || 0}</div>
                  <p className="text-xs text-muted-foreground">+{businessStats?.monthly_growth || 0}% este mes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${businessStats?.total_revenue?.toLocaleString() || 0}</div>
                  <p className="text-xs text-muted-foreground">Total acumulado</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tendencia Mensual de Contratos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="contratos" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ingresos Mensuales</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Ingresos']} />
                      <Legend />
                      <Bar dataKey="ingresos" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Lawyer Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas por Abogado</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Abogado</TableHead>
                      <TableHead>Contratos</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Agentes Creados</TableHead>
                      <TableHead>Agentes Activos</TableHead>
                      <TableHead>Rendimiento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lawyerStats.map((stat) => (
                      <TableRow key={stat.lawyer_id}>
                        <TableCell className="font-medium">{stat.lawyer_name}</TableCell>
                        <TableCell>{stat.contracts_count}</TableCell>
                        <TableCell>${stat.total_value.toLocaleString()}</TableCell>
                        <TableCell>{stat.agents_created}</TableCell>
                        <TableCell>
                          <Badge variant={stat.active_agents > 0 ? "default" : "secondary"}>
                            {stat.active_agents}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">
                              {stat.total_value > 50000 ? 'Excelente' : stat.total_value > 20000 ? 'Bueno' : 'Regular'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Recent Contracts */}
            <Card>
              <CardHeader>
                <CardTitle>Contratos Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de Documento</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.slice(0, 10).map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">{sanitizeInput(contract.document_type)}</TableCell>
                        <TableCell>
                          {contract.user_name ? sanitizeInput(contract.user_name) : 'Anónimo'}
                          {contract.user_email && (
                            <div className="text-sm text-muted-foreground">{sanitizeInput(contract.user_email)}</div>
                          )}
                        </TableCell>
                        <TableCell>${contract.price.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            contract.status === 'pagado' ? 'default' :
                            contract.status === 'revisado' ? 'secondary' :
                            'outline'
                          }>
                            {contract.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(contract.created_at).toLocaleDateString()}</TableCell>
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