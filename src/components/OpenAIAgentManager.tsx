import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  BarChart3,
  Settings,
  PlayCircle,
  StopCircle,
  RefreshCw,
  Zap
} from "lucide-react";

interface OpenAIAgentData {
  legal_agent_id: string;
  agent_name: string;
  document_name: string;
  target_audience: string;
  openai_enabled: boolean;
  openai_conversations_count: number;
  openai_success_rate: number;
  last_openai_activity: string | null;
  openai_agent_id: string | null;
  openai_external_id: string | null;
  openai_status: string | null;
  openai_created_at: string | null;
  jobs_completed: number;
  jobs_failed: number;
  jobs_pending: number;
  total_conversations: number;
  successful_documents: number;
  calculated_success_rate: number;
}

interface OpenAIJobData {
  id: string;
  legal_agent_id: string;
  status: string;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  legal_agents: {
    name: string;
    document_name: string;
  };
}

export default function OpenAIAgentManager() {
  const [agents, setAgents] = useState<OpenAIAgentData[]>([]);
  const [jobs, setJobs] = useState<OpenAIJobData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await loadAgents();
    setLoading(false);
  };

  const loadAgents = async () => {
    try {
      // Get OpenAI agents with legal agent data
      const { data, error } = await supabase
        .from('openai_agents')
        .select(`
          *,
          legal_agents!inner (
            id,
            name,
            document_name,
            target_audience,
            openai_enabled,
            openai_conversations_count,
            openai_success_rate,
            last_openai_activity
          )
        `)
        .eq('status', 'active');

      if (error) throw error;

      // Transform data to match expected format
      const transformedData = data?.map(agent => ({
        legal_agent_id: agent.legal_agent_id,
        agent_name: agent.legal_agents?.name || '',
        document_name: agent.legal_agents?.document_name || '',
        target_audience: agent.legal_agents?.target_audience || '',
        openai_enabled: agent.legal_agents?.openai_enabled || false,
        openai_conversations_count: agent.legal_agents?.openai_conversations_count || 0,
        openai_success_rate: agent.legal_agents?.openai_success_rate || 0,
        last_openai_activity: agent.legal_agents?.last_openai_activity,
        openai_agent_id: agent.id,
        openai_external_id: agent.openai_agent_id,
        openai_status: agent.status,
        openai_created_at: agent.created_at,
        // Calculate stats from conversations/jobs
        jobs_completed: 0,
        jobs_failed: 0, 
        jobs_pending: 0,
        total_conversations: agent.legal_agents?.openai_conversations_count || 0,
        successful_documents: 0,
        calculated_success_rate: agent.legal_agents?.openai_success_rate || 0
      })) || [];

      setAgents(transformedData);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast({
        title: "Error al cargar agentes",
        description: "No se pudieron cargar los datos de agentes OpenAI",
        variant: "destructive"
      });
    }
  };

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('openai_agent_jobs')
        .select(`
          *,
          legal_agents (
            name,
            document_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const toggleOpenAIAgent = async (legalAgentId: string, currentEnabled: boolean) => {
    try {
      if (currentEnabled) {
        // Disable OpenAI agent
        const { error: updateError } = await supabase
          .from('openai_agents')
          .update({ status: 'inactive' })
          .eq('legal_agent_id', legalAgentId);

        if (updateError) throw updateError;

        await supabase
          .from('legal_agents')
          .update({ openai_enabled: false })
          .eq('id', legalAgentId);

        toast({
          title: "Agente OpenAI deshabilitado",
          description: "El agente OpenAI ha sido desactivado exitosamente"
        });
      } else {
        // Enable OpenAI agent - create or reactivate
        const { data, error } = await supabase.functions.invoke('create-openai-agent', {
          body: {
            legal_agent_id: legalAgentId,
            force_recreate: false
          }
        });

        if (error) throw error;

        toast({
          title: "Agente OpenAI habilitado",
          description: "El agente OpenAI ha sido creado/activado exitosamente"
        });
      }

      await loadAgents();
    } catch (error) {
      console.error('Error toggling OpenAI agent:', error);
      toast({
        title: "Error",
        description: `No se pudo ${currentEnabled ? 'deshabilitar' : 'habilitar'} el agente OpenAI`,
        variant: "destructive"
      });
    }
  };

  const processJobs = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-openai-agent-jobs');
      
      if (error) throw error;

      toast({
        title: "Jobs procesados",
        description: `Se procesaron ${data.processed || 0} trabajos pendientes`
      });

      await loadData();
    } catch (error) {
      console.error('Error processing jobs:', error);
      toast({
        title: "Error al procesar jobs",
        description: "No se pudieron procesar los trabajos pendientes",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'processing': return 'bg-yellow-500';
      case 'pending': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <AlertTriangle className="w-4 h-4" />;
      case 'processing': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const enabledAgents = agents.filter(a => a.openai_enabled);
  const totalConversations = agents.reduce((sum, a) => sum + a.total_conversations, 0);
  const avgSuccessRate = agents.length > 0 
    ? agents.reduce((sum, a) => sum + a.calculated_success_rate, 0) / agents.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-8 h-8" />
            Gestión de Agentes OpenAI
          </h2>
          <p className="text-muted-foreground">
            Administra la integración de OpenAI para experiencias conversacionales avanzadas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Agentes Habilitados</p>
                <p className="text-2xl font-bold">{enabledAgents.length}</p>
                <p className="text-xs text-muted-foreground">de {agents.length} total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Conversaciones</p>
                <p className="text-2xl font-bold">{totalConversations}</p>
                <p className="text-xs text-muted-foreground">total procesadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Tasa de Éxito</p>
                <p className="text-2xl font-bold">{avgSuccessRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agentes ({agents.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          {agents.map((agent) => (
            <Card key={agent.legal_agent_id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{agent.agent_name}</CardTitle>
                    <CardDescription>
                      {agent.document_name} • {agent.target_audience === 'empresas' ? 'Empresas' : 'Personas'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={agent.openai_enabled}
                      onCheckedChange={() => toggleOpenAIAgent(agent.legal_agent_id, agent.openai_enabled)}
                    />
                    <Badge variant={agent.openai_enabled ? "default" : "secondary"}>
                      {agent.openai_enabled ? (
                        <><PlayCircle className="w-3 h-3 mr-1" /> Activo</>
                      ) : (
                        <><StopCircle className="w-3 h-3 mr-1" /> Inactivo</>
                      )}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              {agent.openai_enabled && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Conversaciones</p>
                      <p className="font-semibold">{agent.total_conversations}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Documentos Exitosos</p>
                      <p className="font-semibold">{agent.successful_documents}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tasa de Éxito</p>
                      <p className="font-semibold">{agent.calculated_success_rate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Última Actividad</p>
                      <p className="font-semibold">
                        {agent.last_openai_activity 
                          ? new Date(agent.last_openai_activity).toLocaleDateString()
                          : 'Nunca'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {agent.calculated_success_rate > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Rendimiento</span>
                        <span>{agent.calculated_success_rate.toFixed(1)}%</span>
                      </div>
                      <Progress value={agent.calculated_success_rate} className="h-2" />
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>


        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Success Rate Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Rendimiento por Agente</CardTitle>
                <CardDescription>
                  Tasa de éxito en la generación de documentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {enabledAgents.map((agent) => (
                    <div key={agent.legal_agent_id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="truncate">{agent.agent_name}</span>
                        <span>{agent.calculated_success_rate.toFixed(1)}%</span>
                      </div>
                      <Progress value={agent.calculated_success_rate} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Usage Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Uso</CardTitle>
                <CardDescription>
                  Estadísticas generales de OpenAI Agents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Agentes Activos:</span>
                    <span className="font-semibold">{enabledAgents.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Conversaciones:</span>
                    <span className="font-semibold">{totalConversations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Documentos Generados:</span>
                    <span className="font-semibold">
                      {agents.reduce((sum, a) => sum + a.successful_documents, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tasa de Éxito Promedio:</span>
                    <span className="font-semibold">{avgSuccessRate.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}