import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Briefcase, MessageSquare, FileText, Settings, BarChart3, User, Calendar, Phone, Clock, Brain, TrendingUp, Sparkles, Loader2, UserPlus, Heart, Kanban, Zap, Building2 } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { ToolCostIndicator } from "@/components/credits/ToolCostIndicator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CRMClientsView from "./crm/CRMClientsView";
import CRMCasesView from "./crm/CRMCasesView";
import CRMCommunicationsView from "./crm/CRMCommunicationsView";
import CRMDocumentsView from "./crm/CRMDocumentsView";
import CRMTasksView from "./crm/CRMTasksView";
import CRMAutomationView from "./crm/CRMAutomationView";
import CRMAnalyticsView from "./crm/CRMAnalyticsView";
import CRMLeadsView from "./crm/CRMLeadsView";
import CasePipelineView from "./crm/CasePipelineView";
import LeadPipeline from "./crm/LeadPipeline";
import ClientHealthView from "./crm/ClientHealthView";
import CRMEntitiesView from "./crm/CRMEntitiesView";

interface CRMModuleProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

interface CRMStats {
  clients: number;
  cases: number;
  tasks: number;
  communications: number;
}

export default function CRMModule({ user, currentView, onViewChange, onLogout }: CRMModuleProps) {
  const [activeTab, setActiveTab] = useState<'operaciones' | 'relaciones' | 'gestion' | 'inteligencia'>('operaciones');
  const [subView, setSubView] = useState<string>('pipeline');
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState<CRMStats>({ clients: 0, cases: 0, tasks: 0, communications: 0 });
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const { toast } = useToast();
  const { consumeCredits, hasEnoughCredits, getToolCost } = useCredits(user?.id);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [clientsResult, casesResult, tasksResult, communicationsResult] = await Promise.all([
        supabase.from('crm_clients').select('id').eq('lawyer_id', user.id),
        supabase.from('crm_cases').select('id').eq('lawyer_id', user.id),
        supabase.from('crm_tasks').select('id').eq('lawyer_id', user.id),
        supabase.from('crm_communications').select('id').eq('lawyer_id', user.id)
      ]);

      setStats({
        clients: clientsResult.data?.length || 0,
        cases: casesResult.data?.length || 0,
        tasks: tasksResult.data?.length || 0,
        communications: communicationsResult.data?.length || 0
      });
    } catch (error) {
      console.error('Error fetching CRM stats:', error);
    }
  };

  const handleAISegmentation = async () => {
    // Check credits first
    if (!hasEnoughCredits('crm_ai')) {
      toast({
        title: "Créditos insuficientes",
        description: `Necesitas ${getToolCost('crm_ai')} créditos para la segmentación IA.`,
        variant: "destructive",
      });
      return;
    }

    // Consume credits
    const creditResult = await consumeCredits('crm_ai');
    if (!creditResult.success) {
      return; // Toast already shown by consumeCredits
    }

    setIsLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-ai-segmentation', {
        body: { lawyerId: user.id }
      });

      if (error) throw error;

      toast({
        title: "Segmentación IA completada",
        description: "Los clientes han sido organizados automáticamente por segmentos inteligentes",
      });

      // Refresh the analytics view
      if (activeTab === 'inteligencia') {
        // This will trigger a refresh in the analytics component
      }
    } catch (error) {
      console.error('Error in AI segmentation:', error);
      toast({
        title: "Error en segmentación",
        description: "No se pudo completar la segmentación automática",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  const renderSubContent = () => {
    const commonProps = { 
      searchTerm, 
      onRefresh: fetchStats, 
      lawyerData: user 
    };

    switch (subView) {
      // Operaciones
      case 'pipeline':
        return <CasePipelineView lawyerData={user} />;
      case 'cases':
        return <CRMCasesView {...commonProps} />;
      case 'tasks':
        return <CRMTasksView {...commonProps} />;
      // Relaciones
      case 'clients':
        return <CRMClientsView {...commonProps} />;
      case 'entities':
        return <CRMEntitiesView {...commonProps} />;
      case 'health':
        return <ClientHealthView {...commonProps} />;
      case 'communications':
        return <CRMCommunicationsView {...commonProps} />;
      // Gestión
      case 'leads':
        return <CRMLeadsView {...commonProps} />;
      case 'lead-pipeline':
        return <LeadPipeline {...commonProps} />;
      case 'documents':
        return <CRMDocumentsView {...commonProps} />;
      // Inteligencia
      case 'analytics':
        return <CRMAnalyticsView {...commonProps} />;
      case 'automation':
        return <CRMAutomationView {...commonProps} />;
      default:
        return <CasePipelineView lawyerData={user} />;
    }
  };

  // Define sub-views for each main tab
  const tabSubViews = {
    operaciones: [
      { id: 'pipeline', label: 'Pipeline', icon: Kanban },
      { id: 'cases', label: 'Casos', icon: Briefcase },
      { id: 'tasks', label: 'Tareas', icon: Clock },
    ],
    relaciones: [
      { id: 'clients', label: 'Clientes', icon: Users },
      { id: 'entities', label: 'Entidades', icon: Building2 },
      { id: 'health', label: 'Salud', icon: Heart },
      { id: 'communications', label: 'Comunicaciones', icon: MessageSquare },
    ],
    gestion: [
      { id: 'lead-pipeline', label: 'Leads IA', icon: Zap },
      { id: 'leads', label: 'Lista Leads', icon: UserPlus },
      { id: 'documents', label: 'Documentos', icon: FileText },
    ],
    inteligencia: [
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'automation', label: 'Automatización', icon: Settings },
    ],
  };

  // Set default sub-view when switching main tabs
  const handleTabChange = (tab: string) => {
    const newTab = tab as 'operaciones' | 'relaciones' | 'gestion' | 'inteligencia';
    setActiveTab(newTab);
    setSubView(tabSubViews[newTab][0].id);
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Toolbar with Search and AI Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar clientes, casos, comunicaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <ToolCostIndicator toolType="crm_ai" lawyerId={user?.id} />
          <Button
            onClick={handleAISegmentation}
            disabled={isLoadingAI || !hasEnoughCredits('crm_ai')}
            size="sm"
          >
            {isLoadingAI ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando IA...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Segmentación IA
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xl font-bold">{stats.clients}</p>
              <p className="text-xs text-muted-foreground">Clientes</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xl font-bold">{stats.cases}</p>
              <p className="text-xs text-muted-foreground">Casos</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xl font-bold">{stats.communications}</p>
              <p className="text-xs text-muted-foreground">Comunicaciones</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xl font-bold">{stats.tasks}</p>
              <p className="text-xs text-muted-foreground">Tareas</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main CRM Tabs */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid grid-cols-4 h-auto p-1">
              <TabsTrigger value="operaciones" className="flex items-center gap-2 py-2">
                <Kanban className="h-4 w-4" />
                <span className="hidden sm:inline">Operaciones</span>
              </TabsTrigger>
              <TabsTrigger value="relaciones" className="flex items-center gap-2 py-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Relaciones</span>
              </TabsTrigger>
              <TabsTrigger value="gestion" className="flex items-center gap-2 py-2">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Gestión</span>
              </TabsTrigger>
              <TabsTrigger value="inteligencia" className="flex items-center gap-2 py-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Inteligencia</span>
              </TabsTrigger>
            </TabsList>

            {/* Sub-navigation pills */}
            <div className="flex flex-wrap gap-2 mt-4 p-3 bg-muted/30 rounded-lg border">
              {tabSubViews[activeTab].map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={subView === item.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSubView(item.id)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                );
              })}
            </div>

            <div className="mt-4">
              {renderSubContent()}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}