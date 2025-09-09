import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Briefcase, MessageSquare, FileText, Settings, BarChart3, User, Calendar, Phone, Clock, Brain, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import UnifiedSidebar from "../UnifiedSidebar";
import CRMClientsView from "./crm/CRMClientsView";
import CRMCasesView from "./crm/CRMCasesView";
import CRMCommunicationsView from "./crm/CRMCommunicationsView";
import CRMDocumentsView from "./crm/CRMDocumentsView";
import CRMTasksView from "./crm/CRMTasksView";
import CRMAutomationView from "./crm/CRMAutomationView";
import CRMAnalyticsView from "./crm/CRMAnalyticsView";

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
  const [activeTab, setActiveTab] = useState<'clients' | 'cases' | 'communications' | 'documents' | 'tasks' | 'automation' | 'analytics'>('clients');
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState<CRMStats>({ clients: 0, cases: 0, tasks: 0, communications: 0 });
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const { toast } = useToast();

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
      if (activeTab === 'analytics') {
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

  const renderTabContent = () => {
    const commonProps = { 
      searchTerm, 
      onRefresh: fetchStats, 
      lawyerData: user 
    };

    switch (activeTab) {
      case 'clients':
        return <CRMClientsView {...commonProps} />;
      case 'cases':
        return <CRMCasesView {...commonProps} />;
      case 'communications':
        return <CRMCommunicationsView {...commonProps} />;
      case 'documents':
        return <CRMDocumentsView {...commonProps} />;
      case 'tasks':
        return <CRMTasksView {...commonProps} />;
      case 'automation':
        return <CRMAutomationView {...commonProps} />;
      case 'analytics':
        return <CRMAnalyticsView {...commonProps} />;
      default:
        return <CRMClientsView {...commonProps} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-blue-500/5">
        <UnifiedSidebar 
          user={user}
          currentView={currentView}
          onViewChange={onViewChange}
          onLogout={onLogout}
        />

        {/* Main Content */}
        <main className="flex-1">
          {/* Enhanced Header */}
          <header className="h-16 border-b bg-gradient-to-r from-background/95 to-blue-500/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-50"></div>
            <div className="relative flex h-16 items-center px-6">
              <SidebarTrigger className="mr-4 hover:bg-blue-500/10 rounded-lg p-2 transition-all duration-200" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                    Gestión de Clientes IA
                  </h1>
                  <p className="text-sm text-muted-foreground">Sistema integral de relaciones con clientes</p>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-6 py-8">
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
                      
                      <Button
                        onClick={handleAISegmentation}
                        disabled={isLoadingAI}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-500 shadow-lg hover:shadow-xl transition-all duration-300"
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

                    {/* Enhanced Tabs Interface */}
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
                      <TabsList className="grid w-full grid-cols-6 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl p-1 border border-blue-200">
                        <TabsTrigger 
                          value="clients" 
                          className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
                        >
                          <Users className="h-4 w-4" />
                          <span className="hidden sm:inline">Clientes</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="cases"
                          className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
                        >
                          <Briefcase className="h-4 w-4" />
                          <span className="hidden sm:inline">Casos</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="communications"
                          className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span className="hidden sm:inline">Comunicaciones</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="documents"
                          className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="hidden sm:inline">Documentos</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="automation"
                          className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
                        >
                          <Settings className="h-4 w-4" />
                          <span className="hidden sm:inline">Automatización</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="analytics"
                          className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span className="hidden sm:inline">Analíticas</span>
                        </TabsTrigger>
                      </TabsList>

                      <div className="mt-6">
                        <TabsContent value="clients" className="mt-0">
                          {renderTabContent()}
                        </TabsContent>
                        <TabsContent value="cases" className="mt-0">
                          {renderTabContent()}
                        </TabsContent>
                        <TabsContent value="communications" className="mt-0">
                          {renderTabContent()}
                        </TabsContent>
                        <TabsContent value="documents" className="mt-0">
                          {renderTabContent()}
                        </TabsContent>
                        <TabsContent value="tasks" className="mt-0">
                          {renderTabContent()}
                        </TabsContent>
                        <TabsContent value="automation" className="mt-0">
                          {renderTabContent()}
                        </TabsContent>
                        <TabsContent value="analytics" className="mt-0">
                          {renderTabContent()}
                        </TabsContent>
                      </div>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}