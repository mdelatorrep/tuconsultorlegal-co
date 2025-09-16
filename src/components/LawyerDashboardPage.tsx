import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLawyerAuth } from "@/hooks/useLawyerAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, User, Calendar, DollarSign, Save, CheckCircle, Bot, Plus, Settings, LogOut, Scale, BarChart3, Brain, BookOpen, Search, Eye, PenTool, Target, Home, Lock, Crown, Users } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import LawyerStatsSection from "./LawyerStatsSection";
import LawyerLandingPage from "./LawyerLandingPage";
import AgentCreatorPage from "./AgentCreatorPage";
import AgentManagerPage from "./AgentManagerPage";
import LawyerTrainingPage from "./LawyerTrainingPage";
import LawyerBlogManager from "./LawyerBlogManager";
import ResearchModule from "./lawyer-modules/ResearchModule";
import AnalyzeModule from "./lawyer-modules/AnalyzeModule";
import DraftModule from "./lawyer-modules/DraftModule";
import StrategizeModule from "./lawyer-modules/StrategizeModule";
import CRMModule from "./lawyer-modules/CRMModule";
import PremiumFeatureCard from "./PremiumFeatureCard";
import LawyerOnboardingCoachmarks from "./LawyerOnboardingCoachmarks";
import { useLawyerOnboarding } from "@/hooks/useLawyerOnboarding";
import { SubscriptionManager } from "./SubscriptionManager";
import { SubscriptionStatusIndicator } from "./SubscriptionStatusIndicator";

interface DocumentToken {
  id: string;
  token: string;
  document_type: string;
  document_content: string;
  price: number;
  status: string;
  user_email: string | null;
  user_name: string | null;
  created_at: string;
  updated_at: string;
  user_observations?: string | null;
  user_observation_date?: string | null;
  sla_hours?: number;
  sla_deadline?: string;
  sla_status?: string;
}

interface LawyerDashboardPageProps {
  onOpenChat: (message: string) => void;
}

export default function LawyerDashboardPage({ onOpenChat }: LawyerDashboardPageProps) {
  const [documents, setDocuments] = useState<DocumentToken[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentToken | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'stats' | 'agent-creator' | 'agent-manager' | 'training' | 'blog-manager' | 'research' | 'analyze' | 'draft' | 'strategize' | 'subscription' | 'crm'>('dashboard');
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user, logout, checkAuthStatus } = useLawyerAuth();
  const isMobile = useIsMobile();
  
  // Onboarding system
  const { 
    shouldShowOnboarding, 
    isLoading: onboardingLoading, 
    markOnboardingCompleted, 
    skipOnboarding 
  } = useLawyerOnboarding(user?.id);

  // Helper functions
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'solicitado': return 'default';
      case 'revisado': return 'secondary';
      case 'revision_usuario': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'solicitado': return 'Solicitado';
      case 'revisado': return 'Revisado';
      case 'revision_usuario': return 'Revisión Usuario';
      default: return status;
    }
  };

  const getSlaStatusVariant = (slaStatus?: string) => {
    switch (slaStatus) {
      case 'on_time': return 'default';
      case 'at_risk': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'secondary';
    }
  };

  const getSlaStatusText = (slaStatus?: string) => {
    switch (slaStatus) {
      case 'on_time': return 'A tiempo';
      case 'at_risk': return 'En riesgo';
      case 'overdue': return 'Vencido';
      default: return 'Pendiente';
    }
  };

  // Fetch documents when authenticated and setup real-time updates
  useEffect(() => {
    if (isAuthenticated) {
      fetchDocuments();
      
      // Setup real-time updates for document changes
      const channel = supabase
        .channel('document-tokens-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'document_tokens',
            filter: 'status=in.(solicitado,revision_usuario)'
          },
          (payload) => {
            console.log('Document real-time update:', payload);
            // Refresh documents when changes occur
            fetchDocuments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]);

  const fetchDocuments = async () => {
    try {
      if (!user?.id) {
        console.log('No user ID available for fetching documents');
        setDocuments([]);
        setIsLoading(false);
        return;
      }

      // First get the lawyer's agents
      const { data: lawyerAgents, error: agentsError } = await supabase
        .from('legal_agents')
        .select('name')
        .eq('created_by', user.id);

      if (agentsError) {
        console.error('Error fetching lawyer agents:', agentsError);
        setDocuments([]);
        setIsLoading(false);
        return;
      }

      // If lawyer has no agents, return empty array
      if (!lawyerAgents || lawyerAgents.length === 0) {
        console.log('Lawyer has no agents, no documents to show');
        setDocuments([]);
        setIsLoading(false);
        return;
      }

      // Get all documents and filter by lawyer's agent names
      const { data: allDocuments, error: documentsError } = await supabase
        .from('document_tokens')
        .select('*')
        .in('status', ['solicitado', 'revision_usuario'])
        .order('created_at', { ascending: false });

      if (documentsError) {
        console.error('Error fetching documents:', documentsError);
        setDocuments([]);
        setIsLoading(false);
        return;
      }

      // Filter documents by matching document_type with lawyer's agent names
      const agentNames = lawyerAgents.map(agent => agent.name.toLowerCase().trim());
      const filteredDocuments = allDocuments?.filter(doc => {
        const docType = doc.document_type.toLowerCase().trim();
        return agentNames.some(agentName => 
          docType.includes(agentName) || 
          agentName.includes(docType) ||
          (docType.includes('arrendamiento') && agentName.includes('arrendamiento'))
        );
      }) || [];

      console.log(`Filtered ${filteredDocuments.length} documents from ${allDocuments?.length || 0} total for lawyer's ${lawyerAgents.length} agents`);
      setDocuments(filteredDocuments);
    } catch (error) {
      console.error('Error:', error);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentClick = (doc: DocumentToken) => {
    if (selectedDocument?.id === doc.id) {
      setSelectedDocument(null);
      setEditedContent("");
    } else {
      setSelectedDocument(doc);
      setEditedContent(doc.document_content);
    }
  };

  const handleReviewDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('document_tokens')
        .update({ status: 'revision_usuario' })
        .eq('id', documentId);

      if (error) {
        console.error('Error updating document:', error);
        toast({
          title: "Error",
          description: "No se pudo marcar el documento como revisado",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Documento actualizado",
        description: "El documento ha sido marcado como listo para revisión del usuario",
      });

      // Update local state immediately for better UX
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, status: 'revision_usuario' as any }
          : doc
      ));

      // Also refresh from server
      await fetchDocuments();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedDocument) {
      console.error('No document selected for saving');
      toast({
        title: "Error",
        description: "No hay documento seleccionado para guardar",
        variant: "destructive",
      });
      return;
    }

    console.log('Saving document:', {
      id: selectedDocument.id,
      originalContent: selectedDocument.document_content.substring(0, 100) + '...',
      editedContent: editedContent.substring(0, 100) + '...',
      hasChanges: selectedDocument.document_content !== editedContent
    });

    if (selectedDocument.document_content === editedContent) {
      toast({
        title: "Sin cambios",
        description: "No hay cambios que guardar",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('document_tokens')
        .update({ 
          document_content: editedContent,
          reviewed_by_lawyer_id: user?.id,
          reviewed_by_lawyer_name: user?.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDocument.id);

      if (error) {
        console.error('Error saving document:', error);
        toast({
          title: "Error",
          description: `No se pudo guardar el documento: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Document saved successfully');

      // Update local state immediately
      setDocuments(prev => prev.map(doc => 
        doc.id === selectedDocument.id 
          ? { ...doc, document_content: editedContent, updated_at: new Date().toISOString() }
          : doc
      ));

      // Update selected document state
      setSelectedDocument(prev => prev ? { 
        ...prev, 
        document_content: editedContent,
        updated_at: new Date().toISOString()
      } : null);

      toast({
        title: "Documento guardado",
        description: "Los cambios han sido guardados exitosamente",
      });

      // Refresh from server to ensure consistency
      await fetchDocuments();
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al guardar el documento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return <LawyerLandingPage onOpenChat={onOpenChat} />;
  }

  // Show loading if auth is still loading
  if (authLoading || onboardingLoading) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground text-sm md:text-base">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  // Sidebar menu configuration
  const menuItems = [
    {
      title: "Panel Principal",
      items: [
        {
          title: "Dashboard",
          icon: Home,
          view: "dashboard" as const
        }
      ]
    },
    {
      title: "Herramientas Legales",
      items: [
        {
          title: "Investigación",
          icon: Search,
          view: "research" as const,
          isPremium: !user?.canUseAiTools
        },
        {
          title: "Análisis",
          icon: Eye,
          view: "analyze" as const,
          isPremium: !user?.canUseAiTools
        },
        {
          title: "Redacción",
          icon: PenTool,
          view: "draft" as const,
          isPremium: !user?.canUseAiTools
        },
        {
          title: "Estrategia",
          icon: Target,
          view: "strategize" as const,
          isPremium: !user?.canUseAiTools
        },
        {
          title: "Gestión de Clientes",
          icon: Users,
          view: "crm" as const,
          isPremium: !user?.canUseAiTools
        }
      ]
    },
    ...(user?.canCreateAgents ? [{
      title: "Gestión IA",
      items: [
        {
          title: "Crear Agente",
          icon: Bot,
          view: "agent-creator" as const,
          isPremium: false
        },
        {
          title: "Gestionar Agentes",
          icon: Settings,
          view: "agent-manager" as const,
          isPremium: false
        },
        {
          title: "Métricas",
          icon: BarChart3,
          view: "stats" as const,
          isPremium: false
        }
      ]
    }] : []),
    {
      title: "Desarrollo",
      items: [
        {
          title: "Formación IA",
          icon: Brain,
          view: "training" as const
        }
      ]
    },
    ...(user?.canCreateBlogs ? [{
      title: "Contenido",
      items: [
        {
          title: "Gestión Blog",
          icon: BookOpen,
          view: "blog-manager" as const,
          isPremium: false
        }
      ]
    }] : []),
    {
      title: "Cuenta",
      items: [
        {
          title: "Suscripción",
          icon: Crown,
          view: "subscription" as const
        }
      ]
    }
  ];

  // Function to render module content
  const renderModuleContent = () => {
    switch (currentView) {
      case 'agent-creator':
        return <AgentCreatorPage onBack={() => setCurrentView('dashboard')} lawyerData={user} />;
      
      case 'agent-manager':
        return <AgentManagerPage onBack={() => setCurrentView('dashboard')} lawyerData={user} />;
      
      case 'blog-manager':
        return <LawyerBlogManager onBack={() => setCurrentView('dashboard')} lawyerData={user} />;
      
      case 'training':
        return <LawyerTrainingPage user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as any)} onLogout={logout} lawyerData={user} />;
      
      case 'research':
        if (!user?.canUseAiTools) {
          return (
            <PremiumFeatureCard
              title="Investigación Legal"
              description="Realiza investigaciones avanzadas con IA especializada en derecho"
              icon={Search}
              featureName="las herramientas de investigación"
              onRedirectToSubscription={() => setCurrentView('subscription')}
            />
          );
        }
        return <ResearchModule user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as any)} onLogout={logout} />;
      
      case 'analyze':
        if (!user?.canUseAiTools) {
          return (
            <PremiumFeatureCard
              title="Análisis Legal"
              description="Analiza documentos y casos con inteligencia artificial avanzada"
              icon={Eye}
              featureName="las herramientas de análisis"
              onRedirectToSubscription={() => setCurrentView('subscription')}
            />
          );
        }
        return <AnalyzeModule user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as any)} onLogout={logout} />;
      
      case 'draft':
        if (!user?.canUseAiTools) {
          return (
            <PremiumFeatureCard
              title="Redacción Legal"
              description="Redacta documentos legales con asistencia de inteligencia artificial"
              icon={PenTool}
              featureName="las herramientas de redacción"
              onRedirectToSubscription={() => setCurrentView('subscription')}
            />
          );
        }
        return <DraftModule user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as any)} onLogout={logout} />;
      
      case 'strategize':
        if (!user?.canUseAiTools) {
          return (
            <PremiumFeatureCard
              title="Estrategia Legal"
              description="Desarrolla estrategias legales con análisis predictivo de IA"
              icon={Target}
              featureName="las herramientas de estrategia"
              onRedirectToSubscription={() => setCurrentView('subscription')}
            />
          );
        }
        return <StrategizeModule user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as any)} onLogout={logout} />;
      
      
      case 'stats':
        return <LawyerStatsSection />;
      
      case 'subscription':
        return <SubscriptionManager />;
      
      case 'crm':
        if (!user?.canUseAiTools) {
          return (
            <PremiumFeatureCard
              title="Gestión de Clientes"
              description="Sistema integral para gestionar clientes, casos y comunicaciones de manera profesional"
              icon={Users}
              featureName="el sistema de gestión de clientes"
              onRedirectToSubscription={() => setCurrentView('subscription')}
            />
          );
        }
        return <CRMModule user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as any)} onLogout={logout} />;
      
      default:
        return null;
    }
  };

  // If not dashboard view, show module content with sidebar
  if (currentView !== 'dashboard') {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <Sidebar 
            className={`${isMobile ? 'w-16 lg:w-64' : 'w-64'} transition-all duration-300`}
            collapsible="icon"
            variant={isMobile ? "floating" : "sidebar"}
            side="left"
          >
            <SidebarContent>
              {/* Header del Sidebar */}
              <div className="p-4 border-b">
                <h2 className={`text-lg font-semibold text-foreground ${isMobile ? 'hidden lg:block' : ''}`}>
                  Portal Abogados
                </h2>
                <p className={`text-sm text-muted-foreground ${isMobile ? 'hidden lg:block' : ''}`}>
                  {user?.name}
                </p>
              </div>

              {/* Menu Items */}
              {menuItems.map((section, index) => (
                <SidebarGroup key={index}>
                  <SidebarGroupLabel className={isMobile ? 'hidden lg:block' : ''}>
                    {section.title}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.map((item) => (
                        <SidebarMenuItem key={item.view}>
                          <SidebarMenuButton 
                            onClick={() => setCurrentView(item.view)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                              currentView === item.view 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-muted'
                            } ${isMobile ? 'justify-center lg:justify-start' : ''}`}
                            title={isMobile ? item.title : undefined}
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            <span className={`flex items-center gap-2 ${isMobile ? 'hidden lg:flex' : ''}`}>
                              {item.title}
                              {item.isPremium && (
                                <>
                                  <Lock className="h-3 w-3 text-amber-500" />
                                  <Crown className="h-3 w-3 text-amber-500" />
                                </>
                              )}
                            </span>
                            {/* Mobile premium indicators */}
                            {isMobile && item.isPremium && (
                              <div className="absolute top-1 right-1 lg:hidden">
                                <Crown className="h-2 w-2 text-amber-500" />
                              </div>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}

              {/* Logout Button */}
              <div className="p-4 border-t mt-auto">
                <Button
                  onClick={() => {
                    console.log('=== LOGOUT BUTTON CLICKED ===');
                    console.log('User:', user);
                    console.log('IsAuthenticated:', isAuthenticated);
                    console.log('About to call logout function...');
                    logout();
                  }}
                  variant="outline"
                  className={`w-full flex items-center gap-2 ${isMobile ? 'justify-center lg:justify-start px-2 lg:px-4' : ''}`}
                  title={isMobile ? 'Cerrar Sesión' : undefined}
                >
                  <LogOut className="h-4 w-4" />
                  <span className={isMobile ? 'hidden lg:inline' : ''}>Cerrar Sesión</span>
                </Button>
              </div>
            </SidebarContent>
          </Sidebar>

          <main className="flex-1 min-w-0">
            <header className="h-12 lg:h-14 flex items-center border-b px-2 lg:px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <SidebarTrigger className="mr-2 lg:mr-4" />
              <h1 className="text-base lg:text-lg font-semibold truncate">
                {menuItems
                  .flatMap((section: any) => section.items)
                  .find((item: any) => item.view === currentView)?.title || 'Panel'}
              </h1>
            </header>
            <div className="flex-1 overflow-hidden">
              {renderModuleContent()}
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-hidden">
        <Sidebar 
          className={`${isMobile ? 'w-14' : 'w-64'} transition-all duration-300 border-r flex-shrink-0`}
          data-tour="lawyer-sidebar"
          collapsible={isMobile ? "icon" : "none"}
          variant="sidebar"
          side="left"
        >
          <SidebarContent>
            {/* Header del Sidebar */}
            <div className={`p-4 border-b ${isMobile ? 'p-2' : 'p-4'}`}>
              <h2 className={`text-lg font-semibold text-foreground ${isMobile ? 'hidden' : 'block'}`}>
                Portal Abogados
              </h2>
              <p className={`text-sm text-muted-foreground ${isMobile ? 'hidden' : 'block'}`}>
                {user?.name}
              </p>
            </div>

            {/* Menu Items */}
            {menuItems.map((section, index) => (
              <SidebarGroup 
                key={index}
                data-tour={
                  section.title === "Herramientas Legales" ? "ai-tools-section" :
                  section.title === "Gestión IA" ? "agent-management-section" :
                  section.title === "Estadísticas" ? "stats-section" : undefined
                }
              >
                <SidebarGroupLabel className={isMobile ? 'sr-only' : ''}>{section.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                     {section.items.map((item) => (
                       <SidebarMenuItem key={item.view}>
                         <SidebarMenuButton 
                            onClick={() => setCurrentView(item.view)}
                            className={`flex items-center ${isMobile ? 'justify-center p-2' : 'justify-between gap-3 px-3 py-2'} rounded-lg transition-colors ${
                              currentView === item.view 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-muted'
                            } ${(item as any).isPremium ? 'opacity-75' : ''}`}
                            tooltip={isMobile ? item.title : undefined}
                          >
                            {isMobile ? (
                              <item.icon className="h-5 w-5" />
                            ) : (
                              <>
                                <div className="flex items-center gap-3">
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.title}</span>
                                </div>
                                {(item as any).isPremium && (
                                  <div className="flex items-center gap-1">
                                    <Crown className="h-3 w-3 text-amber-500" />
                                    <Lock className="h-3 w-3 text-muted-foreground" />
                                  </div>
                                )}
                              </>
                            )}
                         </SidebarMenuButton>
                       </SidebarMenuItem>
                     ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}

            {/* Logout Button */}
            <div className={`border-t mt-auto ${isMobile ? 'p-2' : 'p-4'}`}>
                <Button
                  onClick={() => {
                    console.log('=== LOGOUT BUTTON CLICKED (DASHBOARD) ===');
                    console.log('User:', user);
                    console.log('IsAuthenticated:', isAuthenticated);
                    console.log('About to call logout function...');
                    logout();
                  }}
                  variant="outline"
                  size={isMobile ? "icon" : "default"}
                  className={`${isMobile ? 'w-10 h-10' : 'w-full'} flex items-center ${isMobile ? 'justify-center' : 'gap-2'}`}
                  title={isMobile ? "Cerrar Sesión" : undefined}
                >
                  <LogOut className="h-4 w-4" />
                  {!isMobile && "Cerrar Sesión"}
                </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-auto">
          {/* Header with Sidebar Toggle */}
          <header className="h-12 md:h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 flex-shrink-0">
            <div className="flex h-12 md:h-14 items-center justify-between px-3 md:px-4">
              <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                <SidebarTrigger className="flex-shrink-0" />
                <h1 className="font-semibold truncate text-sm md:text-base lg:text-lg">Dashboard Legal</h1>
              </div>
              <div className="flex-shrink-0">
                <SubscriptionStatusIndicator compact={true} />
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <div className="container mx-auto px-3 md:px-4 lg:px-6 py-3 md:py-4 lg:py-6">
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 lg:space-y-8">
              {/* Welcome Section */}
              <div className="mb-4 md:mb-6 lg:mb-8" data-tour="dashboard-welcome">
                <div className="flex flex-col space-y-3 md:space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground truncate">
                      Bienvenido, {user?.name}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">
                      Tu suite completa de herramientas legales con IA
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3 lg:items-center">
                    <SubscriptionStatusIndicator />
                    <Badge variant="outline" className="flex items-center gap-2 text-xs md:text-sm w-fit">
                      <Scale className="h-3 w-3 md:h-4 md:w-4" />
                      Portal Legal
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Premium Tools Section */}
              {user?.canUseAiTools && (
                <div className="mb-4 md:mb-6 lg:mb-8">
                  <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:items-center sm:space-x-3 mb-3 md:mb-4">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 md:h-5 md:w-5 text-amber-500 flex-shrink-0" />
                      <h2 className="text-base md:text-lg lg:text-xl font-semibold">Herramientas IA Premium</h2>
                    </div>
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs w-fit">
                      ACTIVO
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {[
                      {
                        title: "Investigación",
                        description: "Análisis legal profundo con IA",
                        icon: Search,
                        view: "research",
                        gradient: "from-blue-500 to-cyan-500",
                        bgPattern: "from-blue-50 to-cyan-50"
                      },
                      {
                        title: "Análisis",
                        description: "Evaluación inteligente de documentos",
                        icon: Eye,
                        view: "analyze",
                        gradient: "from-purple-500 to-pink-500",
                        bgPattern: "from-purple-50 to-pink-50"
                      },
                      {
                        title: "Redacción",
                        description: "Creación automática de documentos",
                        icon: PenTool,
                        view: "draft",
                        gradient: "from-green-500 to-emerald-500",
                        bgPattern: "from-green-50 to-emerald-50"
                      },
                      {
                        title: "Estrategia",
                        description: "Planificación legal estratégica",
                        icon: Target,
                        view: "strategize",
                        gradient: "from-orange-500 to-red-500",
                        bgPattern: "from-orange-50 to-red-50"
                      }
                    ].map((tool, index) => (
                      <Card 
                        key={tool.view} 
                        className={`group cursor-pointer transition-all duration-300 hover:scale-[1.02] md:hover:scale-105 hover:shadow-lg border-0 bg-gradient-to-br ${tool.bgPattern} dark:from-gray-800 dark:to-gray-900`}
                        onClick={() => setCurrentView(tool.view as any)}
                      >
                        <CardContent className="p-4 md:p-6">
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-r ${tool.gradient} flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                            <tool.icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                          </div>
                           <h3 className="font-semibold text-sm md:text-base lg:text-lg mb-1 md:mb-2">{tool.title}</h3>
                           <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{tool.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* CRM Module */}
              {user?.canUseAiTools && (
                <div className="mb-6 md:mb-8">
                  <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                    Gestión de Clientes
                  </h2>
                  <Card 
                    className="group cursor-pointer transition-all duration-300 hover:scale-[1.01] md:hover:scale-[1.02] hover:shadow-xl border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
                    onClick={() => setCurrentView('crm')}
                  >
                    <CardContent className="p-4 md:p-6 lg:p-8">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Users className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2">Sistema CRM Inteligente</h3>
                            <p className="text-sm md:text-base text-muted-foreground">Gestiona clientes, casos y comunicaciones con IA avanzada</p>
                          </div>
                        </div>
                        <div className="flex flex-row lg:flex-col items-start lg:items-end lg:text-right gap-2 lg:gap-1">
                          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                            <Bot className="h-3 w-3 md:h-4 md:w-4" />
                            IA Habilitada
                          </div>
                          <Badge variant="outline" className="text-xs">Acceso completo</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Gestión IA */}
              {user?.canCreateAgents && (
                <div className="mb-6 md:mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
                      <h2 className="text-lg md:text-xl font-semibold">Gestión IA</h2>
                    </div>
                    <Badge variant="secondary" className="text-xs w-fit">ADMIN</Badge>
                  </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {[
                      {
                        title: "Crear Agente",
                        description: "Desarrolla nuevos agentes de IA especializados",
                        icon: Bot,
                        view: "agent-creator",
                        color: "purple"
                      },
                      {
                        title: "Gestionar Agentes",
                        description: "Administra tus agentes existentes",
                        icon: Settings,
                        view: "agent-manager",
                        color: "indigo"
                      },
                      {
                        title: "Métricas",
                        description: "Estadísticas de rendimiento",
                        icon: BarChart3,
                        view: "stats",
                        color: "emerald"
                      }
                    ].map((item, index) => (
                      <Card 
                        key={item.view}
                        className="group cursor-pointer transition-all duration-300 hover:scale-[1.02] md:hover:scale-105 hover:shadow-lg"
                        onClick={() => setCurrentView(item.view as any)}
                      >
                         <CardContent className="p-4 md:p-6 text-center">
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-${item.color}-100 dark:bg-${item.color}-900/30 flex items-center justify-center mx-auto mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                            <item.icon className={`h-5 w-5 md:h-6 md:w-6 text-${item.color}-600 dark:text-${item.color}-400`} />
                          </div>
                           <h3 className="font-semibold text-sm md:text-base mb-1 md:mb-2">{item.title}</h3>
                           <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Blog Management */}
              {user?.canCreateBlogs && (
                <div className="mb-6 md:mb-8">
                  <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                    Gestión de Contenido
                  </h2>
                  <Card 
                    className="group cursor-pointer transition-all duration-300 hover:scale-[1.01] md:hover:scale-[1.02] hover:shadow-lg"
                    onClick={() => setCurrentView('blog-manager')}
                  >
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base md:text-lg mb-1">Gestión de Blog</h3>
                          <p className="text-sm md:text-sm text-muted-foreground">Crea y administra contenido legal profesional</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Training & Certification */}
              <div className="mb-6 md:mb-8">
                <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                  <Brain className="h-4 w-4 md:h-5 md:w-5 text-pink-500" />
                  Desarrollo Profesional
                </h2>
                <Card 
                  className="group cursor-pointer transition-all duration-300 hover:scale-[1.01] md:hover:scale-[1.02] hover:shadow-lg border-0 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20"
                  onClick={() => setCurrentView('training')}
                >
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Brain className="h-5 w-5 md:h-6 md:w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base md:text-lg mb-1">Formación IA</h3>
                        <p className="text-sm text-muted-foreground">Certifícate en el uso de herramientas de IA legal</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Documents Section */}
              <div className="mb-6 md:mb-8">
                <h2 className="text-lg md:text-xl font-semibold mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                    Documentos Pendientes
                  </div>
                  {documents.length > 0 && (
                    <Badge variant="secondary" className="w-fit">
                      {documents.length}
                    </Badge>
                  )}
                </h2>
                
                {documents.length === 0 ? (
                  <Card className="border-dashed border-2">
                    <CardContent className="p-8 md:p-12 text-center">
                      <FileText className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-3 md:mb-4 opacity-50" />
                      <h3 className="text-base md:text-lg font-medium mb-2">No hay documentos pendientes</h3>
                      <p className="text-sm md:text-base text-muted-foreground">Los documentos que requieren revisión aparecerán aquí</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {documents.slice(0, 3).map((doc) => (
                      <Card 
                        key={doc.id} 
                        className={`border border-border hover:border-primary transition-colors cursor-pointer ${
                          doc.sla_status === 'at_risk' ? 'border-l-4 border-l-yellow-400' :
                          doc.sla_status === 'overdue' ? 'border-l-4 border-l-red-500' :
                          ''
                        }`}
                        onClick={() => handleDocumentClick(doc)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span className="truncate">{doc.document_type}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant={getStatusVariant(doc.status)}>
                                {getStatusText(doc.status)}
                              </Badge>
                              {doc.sla_status && (
                                <Badge variant={getSlaStatusVariant(doc.sla_status)}>
                                  {getSlaStatusText(doc.sla_status)}
                                </Badge>
                              )}
                            </div>
                          </CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {doc.user_name || 'Usuario anónimo'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(doc.created_at).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                ${doc.price.toLocaleString()}
                              </span>
                            </div>
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                    {documents.length > 3 && (
                      <div className="text-center">
                        <Button variant="outline">
                          Ver todos los documentos ({documents.length - 3} más)
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Acciones Rápidas</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card 
                    className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    onClick={() => setCurrentView('subscription')}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Crown className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h3 className="font-semibold mb-2">Suscripción</h3>
                      <p className="text-sm text-muted-foreground">Gestiona tu plan y facturación</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="font-semibold mb-2">Configuración</h3>
                      <p className="text-sm text-muted-foreground">Personaliza tu experiencia</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="font-semibold mb-2">Soporte</h3>
                      <p className="text-sm text-muted-foreground">Obtén ayuda cuando la necesites</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Upgrade CTA for Free Users */}
              {!user?.canUseAiTools && (
                <div className="mb-8">
                  <Card className="border-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                    <CardContent className="p-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                            <Crown className="h-8 w-8 text-white" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold mb-2">Desbloquea todo tu potencial</h3>
                            <p className="text-white/90">Accede a herramientas IA avanzadas y transforma tu práctica legal</p>
                          </div>
                        </div>
                        <Button 
                          size="lg" 
                          variant="secondary" 
                          className="bg-white text-orange-600 hover:bg-white/90"
                          onClick={() => setCurrentView('subscription')}
                        >
                          Actualizar ahora
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Document Details Panel */}
              {selectedDocument && (
                <div className="space-y-4" data-tour="document-details">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Detalles del Documento</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedDocument(null);
                            setEditedContent("");
                          }}
                        >
                          Cerrar
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Tipo:</label>
                          <p className="text-sm text-muted-foreground">{selectedDocument.document_type}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Cliente:</label>
                          <p className="text-sm text-muted-foreground">{selectedDocument.user_name || 'Usuario anónimo'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Email:</label>
                          <p className="text-sm text-muted-foreground">{selectedDocument.user_email || 'No disponible'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Precio:</label>
                          <p className="text-sm text-muted-foreground">${selectedDocument.price.toLocaleString()}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Contenido del Documento:</label>
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          placeholder="Contenido del documento..."
                          className="min-h-[200px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSave}
                          disabled={isLoading || selectedDocument.document_content === editedContent}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Cambios
                        </Button>
                        {selectedDocument.status === 'solicitado' && (
                          <Button
                            variant="outline"
                            onClick={() => handleReviewDocument(selectedDocument.id)}
                            disabled={isLoading}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marcar como Revisado
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      
      {/* Onboarding Coachmarks - Only show on dashboard, not on subscription page */}
      {currentView === 'dashboard' && (
        <LawyerOnboardingCoachmarks 
          isVisible={shouldShowOnboarding && !onboardingLoading}
          onComplete={() => user?.id && markOnboardingCompleted(user.id)}
          onSkip={() => user?.id && skipOnboarding(user.id)}
        />
      )}
    </SidebarProvider>
  );
};