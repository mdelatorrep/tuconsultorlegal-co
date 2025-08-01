import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLawyerAuth } from "@/hooks/useLawyerAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, User, Calendar, DollarSign, Save, CheckCircle, Bot, Plus, Settings, LogOut, Scale, BarChart3, Brain, BookOpen, Search, Eye, PenTool, Target, Home, Lock, Crown } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import LawyerStatsSection from "./LawyerStatsSection";
import LawyerLogin from "./LawyerLogin";
import AgentCreatorPage from "./AgentCreatorPage";
import AgentManagerPage from "./AgentManagerPage";
import LawyerTrainingPage from "./LawyerTrainingPage";
import LawyerBlogManager from "./LawyerBlogManager";
import ResearchModule from "./lawyer-modules/ResearchModule";
import AnalyzeModule from "./lawyer-modules/AnalyzeModule";
import DraftModule from "./lawyer-modules/DraftModule";
import StrategizeModule from "./lawyer-modules/StrategizeModule";
import IntegrationsModule from "./lawyer-modules/IntegrationsModule";
import PremiumFeatureCard from "./PremiumFeatureCard";

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
  const [currentView, setCurrentView] = useState<'dashboard' | 'stats' | 'agent-creator' | 'agent-manager' | 'training' | 'blog-manager' | 'research' | 'analyze' | 'draft' | 'strategize' | 'integrations'>('dashboard');
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user, logout, checkAuthStatus } = useLawyerAuth();
  const isMobile = useIsMobile();

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
      case 'at_risk': return 'outline';
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

  // Fetch documents when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchDocuments();
    }
  }, [isAuthenticated]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('document_tokens')
        .select('*')
        .in('status', ['solicitado', 'revision_usuario'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        return;
      }

      setDocuments(data || []);
    } catch (error) {
      console.error('Error:', error);
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
        .update({ status: 'revisado' })
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
        description: "El documento ha sido marcado como revisado",
      });

      await fetchDocuments();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedDocument) return;

    try {
      const { error } = await supabase
        .from('document_tokens')
        .update({ document_content: editedContent })
        .eq('id', selectedDocument.id);

      if (error) {
        console.error('Error saving document:', error);
        toast({
          title: "Error",
          description: "No se pudo guardar el documento",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Documento guardado",
        description: "Los cambios han sido guardados exitosamente",
      });

      await fetchDocuments();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LawyerLogin onLoginSuccess={checkAuthStatus} />;
  }

  // Show loading if auth is still loading
  if (authLoading) {
    return (
      <div className="container mx-auto px-6 py-20">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando...</p>
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
          title: "Integraciones",
          icon: Settings,
          view: "integrations" as const,
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
        }
      ]
    }] : [{
      title: "Gestión IA",
      items: [
        {
          title: "Crear Agente",
          icon: Bot,
          view: "agent-creator" as const,
          isPremium: true
        },
        {
          title: "Gestionar Agentes",
          icon: Settings,
          view: "agent-manager" as const,
          isPremium: true
        }
      ]
    }]),
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
    }] : [{
      title: "Contenido",
      items: [
        {
          title: "Gestión Blog",
          icon: BookOpen,
          view: "blog-manager" as const,
          isPremium: true
        }
      ]
    }]),
    {
      title: "Estadísticas",
      items: [
        {
          title: "Métricas",
          icon: BarChart3,
          view: "stats" as const
        }
      ]
    }
  ];

  // Function to render module content
  const renderModuleContent = () => {
    switch (currentView) {
      case 'agent-creator':
        if (!user?.canCreateAgents) {
          return (
            <PremiumFeatureCard
              title="Crear Agentes de IA"
              description="Crea y personaliza agentes de inteligencia artificial especializados en derecho"
              icon={Bot}
              featureName="la creación de agentes"
              onUpgrade={() => {
                toast({
                  title: "Funcionalidad Premium",
                  description: "Contacta al administrador para activar la creación de agentes",
                });
              }}
            />
          );
        }
        return <AgentCreatorPage onBack={() => setCurrentView('dashboard')} lawyerData={user} />;
      
      case 'agent-manager':
        if (!user?.canCreateAgents) {
          return (
            <PremiumFeatureCard
              title="Gestionar Agentes"
              description="Administra y optimiza tus agentes de IA existentes"
              icon={Settings}
              featureName="la gestión de agentes"
              onUpgrade={() => {
                toast({
                  title: "Funcionalidad Premium",
                  description: "Contacta al administrador para activar la gestión de agentes",
                });
              }}
            />
          );
        }
        return <AgentManagerPage onBack={() => setCurrentView('dashboard')} lawyerData={user} />;
      
      case 'blog-manager':
        if (!user?.canCreateBlogs) {
          return (
            <PremiumFeatureCard
              title="Gestión de Blog"
              description="Crea y administra contenido legal para tu blog profesional"
              icon={BookOpen}
              featureName="la gestión del blog"
              onUpgrade={() => {
                toast({
                  title: "Funcionalidad Premium",
                  description: "Contacta al administrador para activar la gestión del blog",
                });
              }}
            />
          );
        }
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
              onUpgrade={() => {
                toast({
                  title: "Funcionalidad Premium",
                  description: "Contacta al administrador para activar las herramientas de IA",
                });
              }}
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
              onUpgrade={() => {
                toast({
                  title: "Funcionalidad Premium",
                  description: "Contacta al administrador para activar las herramientas de IA",
                });
              }}
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
              onUpgrade={() => {
                toast({
                  title: "Funcionalidad Premium",
                  description: "Contacta al administrador para activar las herramientas de IA",
                });
              }}
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
              onUpgrade={() => {
                toast({
                  title: "Funcionalidad Premium",
                  description: "Contacta al administrador para activar las herramientas de IA",
                });
              }}
            />
          );
        }
        return <StrategizeModule user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as any)} onLogout={logout} />;
      
      case 'integrations':
        if (!user?.canUseAiTools) {
          return (
            <PremiumFeatureCard
              title="Integraciones"
              description="Conecta y automatiza workflows con herramientas externas"
              icon={Settings}
              featureName="las integraciones avanzadas"
              onUpgrade={() => {
                toast({
                  title: "Funcionalidad Premium",
                  description: "Contacta al administrador para activar las herramientas de IA",
                });
              }}
            />
          );
        }
        return <IntegrationsModule user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as any)} onLogout={logout} />;
      
      case 'stats':
        return <LawyerStatsSection />;
      
      default:
        return null;
    }
  };

  // If not dashboard view, show module content with sidebar
  if (currentView !== 'dashboard') {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <Sidebar className="w-64">
            <SidebarContent>
              {/* Header del Sidebar */}
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-foreground">Portal Abogados</h2>
                <p className="text-sm text-muted-foreground">{user?.name}</p>
              </div>

              {/* Menu Items */}
              {menuItems.map((section, index) => (
                <SidebarGroup key={index}>
                  <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
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
                            }`}
                          >
                            <item.icon className="h-4 w-4" />
                            <span className="flex items-center gap-2">
                              {item.title}
                              {item.isPremium && (
                                <>
                                  <Lock className="h-3 w-3 text-amber-500" />
                                  <Crown className="h-3 w-3 text-amber-500" />
                                </>
                              )}
                            </span>
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
                  className="w-full flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar Sesión
                </Button>
              </div>
            </SidebarContent>
          </Sidebar>

          <main className="flex-1">
            <header className="h-12 flex items-center border-b px-4">
              <SidebarTrigger />
            </header>
            <div className="flex-1">
              {renderModuleContent()}
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }


  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="w-64">
          <SidebarContent>
            {/* Header del Sidebar */}
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-foreground">Portal Abogados</h2>
              <p className="text-sm text-muted-foreground">{user?.name}</p>
            </div>

            {/* Menu Items */}
            {menuItems.map((section, index) => (
              <SidebarGroup key={index}>
                <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                     {section.items.map((item) => (
                       <SidebarMenuItem key={item.view}>
                         <SidebarMenuButton 
                           onClick={() => setCurrentView(item.view)}
                           className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors ${
                             currentView === item.view 
                               ? 'bg-primary text-primary-foreground' 
                               : 'hover:bg-muted'
                           } ${(item as any).isPremium ? 'opacity-75' : ''}`}
                         >
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
                    console.log('=== LOGOUT BUTTON CLICKED (DASHBOARD) ===');
                    console.log('User:', user);
                    console.log('IsAuthenticated:', isAuthenticated);
                    console.log('About to call logout function...');
                    logout();
                  }}
                  variant="outline"
                className="w-full flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <main className="flex-1">
          {/* Header with Sidebar Toggle */}
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4">
              <SidebarTrigger className="mr-4" />
              <h1 className="text-lg font-semibold">Dashboard Legal</h1>
            </div>
          </header>

          {/* Dashboard Content */}
          <div className="container mx-auto px-6 py-6">
            <div className="max-w-7xl mx-auto">
              {/* Welcome Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">
                      Bienvenido, {user?.name}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                      Gestiona tus documentos legales y herramientas de IA
                    </p>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Portal Legal
                  </Badge>
                </div>
              </div>

              <div className={`${isMobile ? 'space-y-8' : 'grid lg:grid-cols-2 gap-8'}`}>
                {/* Documents List */}
                <div className="space-y-4">
                  <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold mb-4`}>Documentos Pendientes</h2>
                  
                  {documents.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No hay documentos pendientes de revisión</p>
                      </CardContent>
                    </Card>
                  ) : (
                    documents.map((doc) => (
                      <Card key={doc.id} className="border border-border hover:border-primary transition-colors">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span className="truncate">{doc.document_type}</span>
                            <Badge variant={getStatusVariant(doc.status)}>
                              {getStatusText(doc.status)}
                            </Badge>
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
                        <CardContent>
                          <div className="flex justify-between items-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDocumentClick(doc)}
                            >
                              {selectedDocument?.id === doc.id ? 'Ocultar' : 'Ver Detalles'}
                            </Button>
                            {doc.status === 'solicitado' && (
                              <Button
                                size="sm"
                                onClick={() => handleReviewDocument(doc.id)}
                                disabled={isLoading}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marcar como Revisado
                              </Button>
                            )}
                          </div>
                          
                          {/* SLA Information */}
                          {(doc.sla_hours) && (
                            <div className="mt-3 p-2 bg-muted rounded-lg">
                              <div className="flex items-center justify-between text-xs">
                                <span>SLA: {doc.sla_hours}h</span>
                                <Badge 
                                  variant={getSlaStatusVariant(doc.sla_status)}
                                  className="text-xs"
                                >
                                  {getSlaStatusText(doc.sla_status)}
                                </Badge>
                              </div>
                              {doc.sla_deadline && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Vence: {new Date(doc.sla_deadline).toLocaleString()}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Document Details */}
                <div className="space-y-4">
                  <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold mb-4`}>
                    {selectedDocument ? 'Detalles del Documento' : 'Selecciona un Documento'}
                  </h2>
                  
                  {selectedDocument ? (
                    <Card className="border-2 border-primary">
                      <CardHeader>
                        <CardTitle className="text-xl">{selectedDocument.document_type}</CardTitle>
                        <CardDescription>
                          Token: {selectedDocument.token}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Contenido del Documento:</label>
                          <Textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="min-h-[200px] resize-none"
                            placeholder="Contenido del documento..."
                          />
                        </div>

                        {selectedDocument.user_observations && (
                          <div className="p-4 bg-muted rounded-lg">
                            <h4 className="font-medium text-sm mb-2">Observaciones del Usuario:</h4>
                            <p className="text-sm text-muted-foreground">
                              {selectedDocument.user_observations}
                            </p>
                            {selectedDocument.user_observation_date && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Fecha: {new Date(selectedDocument.user_observation_date).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button 
                            onClick={handleSave}
                            disabled={isLoading}
                            className="flex-1"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Guardar Cambios
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedDocument(null)}
                          >
                            Cerrar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="h-64 flex items-center justify-center">
                      <CardContent className="text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          Selecciona un documento para ver sus detalles
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}