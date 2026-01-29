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
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-blue-500/5">
      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Enhanced Header - Mobile First */}
        <header className="h-14 lg:h-16 border-b bg-gradient-to-r from-background/95 to-blue-500/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 relative overflow-hidden sticky top-0 z-40">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-50"></div>
          <div className="relative flex h-14 lg:h-16 items-center px-3 lg:px-6">
            <div className="flex items-center gap-2 lg:gap-3 min-w-0">
              <div className="p-1.5 lg:p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg lg:rounded-xl shadow-lg flex-shrink-0">
                <Users className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base lg:text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent truncate">
                  Gestión de Clientes IA
                </h1>
                <p className="text-xs lg:text-sm text-muted-foreground hidden sm:block truncate">
                  Sistema integral de relaciones con clientes
                </p>
              </div>
            </div>
          </div>
        </header>

          <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 lg:py-8">
            <div className="max-w-7xl mx-auto">
              <div className="space-y-8">
                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 p-8">
                  <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                  <div className="relative">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-2xl">
                        <Users className="h-10 w-10 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">
                          Centro de Gestión de Clientes
                        </h2>
                        <p className="text-lg text-muted-foreground mt-2">
                          Organiza, comunica y administra la relación con tus clientes de manera profesional
                        </p>
                      </div>
                    </div>
                    
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <Users className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="text-2xl font-bold text-blue-600">{stats.clients}</p>
                            <p className="text-sm text-muted-foreground">Clientes activos</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <Briefcase className="h-8 w-8 text-emerald-600" />
                          <div>
                            <p className="text-2xl font-bold text-emerald-600">{stats.cases}</p>
                            <p className="text-sm text-muted-foreground">Casos en progreso</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <MessageSquare className="h-8 w-8 text-purple-600" />
                          <div>
                            <p className="text-2xl font-bold text-purple-600">{stats.communications}</p>
                            <p className="text-sm text-muted-foreground">Comunicaciones</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-8 w-8 text-orange-600" />
                          <div>
                            <p className="text-2xl font-bold text-orange-600">{stats.tasks}</p>
                            <p className="text-sm text-muted-foreground">Tareas pendientes</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced CRM Interface */}
                <Card className="border-0 shadow-2xl bg-gradient-to-br from-white via-white to-blue-500/5 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-500/10 opacity-50"></div>
                  <CardHeader className="relative pb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                          <BarChart3 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                            Panel de Control CRM
                          </CardTitle>
                          <CardDescription className="text-base mt-2">
                            Gestiona todos los aspectos de tu práctica legal desde un solo lugar
                          </CardDescription>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <ToolCostIndicator toolType="crm_ai" lawyerId={user?.id} />
                        <Button
                          onClick={handleAISegmentation}
                          disabled={isLoadingAI || !hasEnoughCredits('crm_ai')}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-500 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
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
                  </CardHeader>
                  
                  <CardContent className="relative space-y-6">
                    {/* Search Bar */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Input
                          placeholder="Buscar clientes, casos, comunicaciones..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="border-blue-200 focus:border-blue-400 rounded-xl bg-white/80 backdrop-blur-sm"
                        />
                      </div>
                    </div>

                    {/* Simplified 4-Tab Interface */}
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                      <TabsList className="grid grid-cols-4 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl p-1.5 border border-blue-200 h-auto">
                        <TabsTrigger 
                          value="operaciones" 
                          className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white rounded-lg transition-all duration-200 py-2.5"
                        >
                          <Kanban className="h-4 w-4" />
                          <span className="hidden sm:inline font-medium">Operaciones</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="relaciones"
                          className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white rounded-lg transition-all duration-200 py-2.5"
                        >
                          <Users className="h-4 w-4" />
                          <span className="hidden sm:inline font-medium">Relaciones</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="gestion"
                          className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-200 py-2.5"
                        >
                          <Zap className="h-4 w-4" />
                          <span className="hidden sm:inline font-medium">Gestión</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="inteligencia"
                          className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white rounded-lg transition-all duration-200 py-2.5"
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span className="hidden sm:inline font-medium">Inteligencia</span>
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
                              className={subView === item.id 
                                ? "bg-primary text-primary-foreground shadow-sm" 
                                : "hover:bg-muted"
                              }
                            >
                              <Icon className="h-4 w-4 mr-2" />
                              {item.label}
                            </Button>
                          );
                        })}
                      </div>

                      <div className="mt-6">
                        {renderSubContent()}
                      </div>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
      </main>
    </div>
  );
}