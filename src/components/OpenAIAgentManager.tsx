import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Star, 
  FileText, 
  Zap,
  TrendingUp,
  Activity,
  RefreshCw
} from "lucide-react";

interface OpenAIAgent {
  id: string;
  legal_agent_id: string;
  openai_agent_id: string;
  name: string;
  model: string;
  status: string;
  created_at: string;
  legal_agents: {
    id: string;
    name: string;
    document_name: string;
    category: string;
    status: string;
  };
}

interface ValidationResult {
  id: string;
  quality_score?: number;
  compliance_score?: number;
  needs_revision?: boolean;
  has_legal_issues?: boolean;
  execution_data: any;
  created_at: string;
}

export default function OpenAIAgentManager() {
  const [agents, setAgents] = useState<OpenAIAgent[]>([]);
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load OpenAI agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('openai_agents')
        .select(`
          *,
          legal_agents (
            id,
            name,
            document_name,
            category,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (agentsError) {
        console.error('Error loading agents:', agentsError);
        toast({
          title: "Error",
          description: "No se pudieron cargar los agentes de OpenAI",
          variant: "destructive",
        });
        return;
      }

      setAgents(agentsData || []);

      // Load recent validations
      const { data: validationsData, error: validationsError } = await supabase
        .from('workflow_executions')
        .select('*')
        .in('status', ['completed'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (validationsError) {
        console.error('Error loading validations:', validationsError);
      } else {
        setValidations(validationsData || []);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast({
      title: "Datos actualizados",
      description: "La información ha sido actualizada exitosamente",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Bot className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 9) return 'text-green-600';
    if (score >= 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const calculateAverageScore = (type: 'quality' | 'compliance') => {
    const relevantValidations = validations.filter(v => 
      v.execution_data && (
        type === 'quality' ? v.execution_data.quality_score : v.execution_data.compliance_score
      )
    );

    if (relevantValidations.length === 0) return 0;

    const scores = relevantValidations.map(v => 
      type === 'quality' ? v.execution_data.quality_score : v.execution_data.compliance_score
    );

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando agentes de OpenAI...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Agentes de OpenAI</h2>
          <p className="text-muted-foreground">
            Gestión y monitoreo de agentes inteligentes
          </p>
        </div>
        <Button onClick={refreshData} disabled={refreshing} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Total Agentes</span>
            </div>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Activos</span>
            </div>
            <div className="text-2xl font-bold">
              {agents.filter(a => a.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Calidad Promedio</span>
            </div>
            <div className="text-2xl font-bold">
              {calculateAverageScore('quality').toFixed(1)}/10
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Cumplimiento</span>
            </div>
            <div className="text-2xl font-bold">
              {calculateAverageScore('compliance').toFixed(1)}/10
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agentes Activos</TabsTrigger>
          <TabsTrigger value="validations">Validaciones Recientes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-4">
            {agents.map((agent) => (
              <Card key={agent.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Bot className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <CardDescription>
                          {agent.legal_agents?.document_name} • {agent.legal_agents?.category}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(agent.status)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(agent.status)}
                        <span className="capitalize">{agent.status}</span>
                      </div>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Modelo:</span>
                      <p className="mt-1">{agent.model}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">OpenAI ID:</span>
                      <p className="mt-1 font-mono text-xs bg-gray-100 p-1 rounded">
                        {agent.openai_agent_id}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Creado:</span>
                      <p className="mt-1">
                        {new Date(agent.created_at).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {agents.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No hay agentes de OpenAI configurados
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="validations" className="space-y-4">
          <div className="grid gap-4">
            {validations.map((validation) => (
              <Card key={validation.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          Validación {validation.execution_data?.agent_type || 'Desconocida'}
                        </CardTitle>
                        <CardDescription>
                          {new Date(validation.created_at).toLocaleString('es-CO')}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {validation.execution_data?.quality_score && (
                        <Badge variant="outline">
                          <Star className="w-3 h-3 mr-1" />
                          <span className={getQualityColor(validation.execution_data.quality_score)}>
                            {validation.execution_data.quality_score}/10
                          </span>
                        </Badge>
                      )}
                      {validation.execution_data?.compliance_score && (
                        <Badge variant="outline">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          <span className={getQualityColor(validation.execution_data.compliance_score)}>
                            {validation.execution_data.compliance_score}/10
                          </span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {validation.execution_data?.needs_revision && (
                      <div className="flex items-center space-x-2 text-yellow-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm">Necesita revisión</span>
                      </div>
                    )}
                    {validation.execution_data?.has_legal_issues && (
                      <div className="flex items-center space-x-2 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm">Problemas legales identificados</span>
                      </div>
                    )}
                    {validation.execution_data?.critical_issues && (
                      <div className="mt-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Problemas críticos:
                        </span>
                        <ul className="text-sm text-red-600 mt-1 space-y-1">
                          {validation.execution_data.critical_issues.slice(0, 3).map((issue: string, index: number) => (
                            <li key={index} className="flex items-start space-x-1">
                              <span>•</span>
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {validations.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No hay validaciones recientes
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Rendimiento de Calidad</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Calidad Promedio</span>
                    <span className="font-bold text-lg">
                      {calculateAverageScore('quality').toFixed(1)}/10
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Documentos que Necesitan Revisión</span>
                    <span className="font-bold text-lg text-yellow-600">
                      {validations.filter(v => v.execution_data?.needs_revision).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Validaciones</span>
                    <span className="font-bold text-lg">
                      {validations.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>Cumplimiento Legal</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cumplimiento Promedio</span>
                    <span className="font-bold text-lg">
                      {calculateAverageScore('compliance').toFixed(1)}/10
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Problemas Legales Detectados</span>
                    <span className="font-bold text-lg text-red-600">
                      {validations.filter(v => v.execution_data?.has_legal_issues).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Documentos Aprobados</span>
                    <span className="font-bold text-lg text-green-600">
                      {validations.filter(v => 
                        !v.execution_data?.has_legal_issues && 
                        !v.execution_data?.needs_revision
                      ).length}
                    </span>
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