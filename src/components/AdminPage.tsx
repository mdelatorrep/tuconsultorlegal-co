import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Check, X, BarChart3, TrendingUp, DollarSign, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  suggested_price: number;
  final_price: number | null;
  created_at: string;
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

interface BusinessStats {
  total_agents: number;
  active_agents: number;
  total_contracts: number;
  total_revenue: number;
  monthly_growth: number;
}

export default function AdminPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [contracts, setContracts] = useState<ContractDetail[]>([]);
  const [businessStats, setBusinessStats] = useState<BusinessStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const { toast } = useToast();

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

  const [showAddAgent, setShowAddAgent] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading data...');

      // Load agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('legal_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (agentsError) {
        console.error('Error loading agents:', agentsError);
        toast({
          title: "Error al cargar agentes",
          description: agentsError.message || "No se pudieron cargar los datos de agentes.",
          variant: "destructive"
        });
        return;
      }
      
      console.log('Agents loaded:', agentsData?.length || 0);
      setAgents(agentsData || []);

      // Load statistics
      await loadStatistics(agentsData || []);
      console.log('Data loading completed successfully');
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Error al cargar datos",
        description: error.message || "Error inesperado al cargar los datos del panel de administración.",
        variant: "destructive"
      });
    }
  };

  const loadStatistics = async (agentsData: Agent[]) => {
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
        total_agents: agentsData.length,
        active_agents: agentsData.filter(a => a.status === 'active').length,
        total_contracts: contractsData?.length || 0,
        total_revenue: totalRevenue,
        monthly_growth: monthlyGrowth
      };
      setBusinessStats(businessStatsData);

      // Generate monthly data for charts
      const monthlyStats = generateMonthlyDataFromContracts(contractsData || []);
      setMonthlyData(monthlyStats);

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

  const generateMonthlyDataFromContracts = (contracts: ContractDetail[]) => {
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
        ingresos: monthRevenue
      });
    }
    
    return last6Months;
  };

  const createAgent = async () => {
    if (!newAgent.name || !newAgent.description || !newAgent.category) {
      toast({
        title: "Error",
        description: "Nombre, descripción y categoría son requeridos",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('legal_agents')
        .insert([{
          name: newAgent.name,
          description: newAgent.description,
          category: newAgent.category,
          ai_prompt: newAgent.ai_prompt,
          suggested_price: newAgent.suggested_price,
          frontend_icon: newAgent.frontend_icon,
          document_name: newAgent.document_name,
          document_description: newAgent.document_description,
          button_cta: newAgent.button_cta,
          target_audience: newAgent.target_audience,
          template_content: "",
          placeholder_fields: []
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "✅ Agente creado exitosamente",
        description: `El agente "${newAgent.name}" ha sido creado`,
      });

      // Reset form
      setNewAgent({
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

      setShowAddAgent(false);
      await loadData();
      
    } catch (error: any) {
      console.error('Create agent error:', error);
      toast({
        title: "❌ Error al crear agente",
        description: error.message || "Error desconocido al crear el agente",
        variant: "destructive"
      });
    }
  };

  const toggleAgentStatus = async (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const { error } = await supabase
        .from('legal_agents')
        .update({ status: newStatus })
        .eq('id', agentId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `Agente ${newStatus === 'active' ? 'activado' : 'desactivado'} exitosamente`,
      });

      await loadData();
    } catch (error: any) {
      console.error('Toggle agent status error:', error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el estado del agente",
        variant: "destructive"
      });
    }
  };

  const deleteAgent = async (agentId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este agente?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('legal_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      toast({
        title: "Agente eliminado",
        description: "El agente ha sido eliminado exitosamente",
      });

      await loadData();
    } catch (error: any) {
      console.error('Delete agent error:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el agente",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
            <p className="text-muted-foreground">Gestiona agentes legales y contratos</p>
          </div>
        </div>

        {/* Business Statistics */}
        {businessStats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Agentes</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{businessStats.total_agents}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agentes Activos</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{businessStats.active_agents}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Contratos</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{businessStats.total_contracts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${businessStats.total_revenue.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Crecimiento Mensual</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{businessStats.monthly_growth}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="agents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="agents">Agentes Legales</TabsTrigger>
            <TabsTrigger value="contracts">Contratos</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Agentes Legales</h2>
              <Button onClick={() => setShowAddAgent(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Agente
              </Button>
            </div>

            {showAddAgent && (
              <Card>
                <CardHeader>
                  <CardTitle>Crear Nuevo Agente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nombre</Label>
                      <Input
                        id="name"
                        value={newAgent.name}
                        onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                        placeholder="Nombre del agente"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Categoría</Label>
                      <Input
                        id="category"
                        value={newAgent.category}
                        onChange={(e) => setNewAgent({...newAgent, category: e.target.value})}
                        placeholder="Categoría del agente"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Descripción</Label>
                      <Input
                        id="description"
                        value={newAgent.description}
                        onChange={(e) => setNewAgent({...newAgent, description: e.target.value})}
                        placeholder="Descripción del agente"
                      />
                    </div>
                    <div>
                      <Label htmlFor="suggested_price">Precio Sugerido</Label>
                      <Input
                        id="suggested_price"
                        type="number"
                        value={newAgent.suggested_price}
                        onChange={(e) => setNewAgent({...newAgent, suggested_price: parseInt(e.target.value) || 0})}
                        placeholder="Precio en pesos"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={createAgent}>Crear Agente</Button>
                    <Button variant="outline" onClick={() => setShowAddAgent(false)}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">{agent.name}</TableCell>
                        <TableCell>{agent.category}</TableCell>
                        <TableCell>
                          <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                            {agent.status === 'active' ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>${agent.final_price || agent.suggested_price}</TableCell>
                        <TableCell className="space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleAgentStatus(agent.id, agent.status)}
                          >
                            {agent.status === 'active' ? (
                              <>
                                <X className="mr-1 h-3 w-3" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <Check className="mr-1 h-3 w-3" />
                                Activar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteAgent(agent.id)}
                          >
                            Eliminar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-4">
            <h2 className="text-2xl font-bold">Contratos</h2>
            <Card>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de Documento</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">{contract.document_type}</TableCell>
                        <TableCell>
                          {contract.user_name || contract.user_email || 'Cliente anónimo'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={contract.status === 'pagado' ? 'default' : 'secondary'}>
                            {contract.status}
                          </Badge>
                        </TableCell>
                        <TableCell>${contract.price}</TableCell>
                        <TableCell>
                          {new Date(contract.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <h2 className="text-2xl font-bold">Analytics</h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Contratos por Mes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="contratos" stroke="#8884d8" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ingresos por Mes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="ingresos" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}