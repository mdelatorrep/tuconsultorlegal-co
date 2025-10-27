import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLawyerAuth } from "@/hooks/useLawyerAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, User, Calendar, DollarSign, Save, CheckCircle, Bot, Plus, Settings, LogOut, Scale, BarChart3, Brain, BookOpen, Search, Eye, PenTool, Target, Home, Lock, Crown, Users, SpellCheck, AlertCircle, Clock, FileImage, Send, Mail } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
import { LawyerChangeEmailDialog } from "./LawyerChangeEmailDialog";
import { PasswordResetDialog } from "./PasswordResetDialog";

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
  lawyer_comments?: string | null;
  lawyer_comments_date?: string | null;
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
  const [lawyerComments, setLawyerComments] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'stats' | 'agent-creator' | 'agent-manager' | 'training' | 'blog-manager' | 'research' | 'analyze' | 'draft' | 'strategize' | 'subscription' | 'crm'>('dashboard');
  const [isCheckingSpelling, setIsCheckingSpelling] = useState(false);
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const [spellCheckResults, setSpellCheckResults] = useState<{
    errors: Array<{
      word: string;
      suggestions: string[];
      context: string;
      position: number;
    }>;
    correctedText: string;
    summary: string;
  } | null>(null);
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user, logout, checkAuthStatus } = useLawyerAuth();
  const isMobile = useIsMobile();
  
  // Email change dialog state
  const [showChangeEmailDialog, setShowChangeEmailDialog] = useState(false);
  
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
            filter: 'status=in.(solicitado,revision_usuario,en_revision_abogado)'
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

      // First get the lawyer's agents (only active/approved ones)
      const { data: lawyerAgents, error: agentsError } = await supabase
        .from('legal_agents')
        .select('name')
        .eq('created_by', user.id)
        .in('status', ['active', 'approved']);

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
        .in('status', ['solicitado', 'revision_usuario', 'en_revision_abogado'])
        .order('created_at', { ascending: false });

      if (documentsError) {
        console.error('Error fetching documents:', documentsError);
        setDocuments([]);
        setIsLoading(false);
        return;
      }

      // Filter documents by matching document_type with lawyer's agent names
      const agentNames = lawyerAgents.map(agent => agent.name.toLowerCase().trim());
      console.log('Lawyer agent names:', agentNames);
      console.log('All documents:', allDocuments?.map(d => ({ token: d.token, type: d.document_type, status: d.status })));
      
      const filteredDocuments = allDocuments?.filter(doc => {
        const docType = doc.document_type.toLowerCase().trim();
        const matches = agentNames.some(agentName => 
          docType === agentName || // Exact match first
          docType.includes(agentName) || 
          agentName.includes(docType) ||
          (docType.includes('arrendamiento') && agentName.includes('arrendamiento'))
        );
        console.log(`Document ${doc.token} (${doc.document_type}): ${matches ? 'MATCH' : 'NO MATCH'}`);
        return matches;
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
      setLawyerComments("");
      setSpellCheckResults(null);
    } else {
      setSelectedDocument(doc);
      setEditedContent(doc.document_content);
      setLawyerComments(doc.lawyer_comments || "");
      setSpellCheckResults(null);
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
        title: "✅ Documento aprobado",
        description: "El documento ha sido enviado al cliente para su revisión y pago",
        duration: 5000,
      });

      // Update local state immediately for better UX
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, status: 'revision_usuario' as any }
          : doc
      ));

      // Cerrar el panel de revisión automáticamente
      setSelectedDocument(null);
      setEditedContent("");
      setLawyerComments("");

      // Also refresh from server
      await fetchDocuments();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Guardar borrador: Guarda cambios pero mantiene el panel abierto y no cambia el estado
  const handleSaveDraft = async () => {
    if (!selectedDocument || !editedContent) {
      toast({
        title: "Error",
        description: "No hay contenido para guardar",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const updateData: any = { 
        document_content: editedContent,
        reviewed_by_lawyer_id: user?.id,
        reviewed_by_lawyer_name: user?.name,
        updated_at: new Date().toISOString()
      };

      // Add lawyer comments if provided
      if (lawyerComments.trim()) {
        updateData.lawyer_comments = lawyerComments.trim();
        updateData.lawyer_comments_date = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('document_tokens')
        .update(updateData)
        .eq('id', selectedDocument.id);

      if (error) {
        console.error('Error saving document draft:', error);
        toast({
          title: "Error",
          description: `No se pudo guardar el borrador: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Document draft saved successfully');

      // Update local state immediately (but don't close the panel)
      setDocuments(prev => prev.map(doc => 
        doc.id === selectedDocument.id 
          ? { 
              ...doc, 
              document_content: editedContent, 
              lawyer_comments: lawyerComments.trim() || doc.lawyer_comments,
              lawyer_comments_date: lawyerComments.trim() ? new Date().toISOString() : doc.lawyer_comments_date,
              updated_at: new Date().toISOString() 
            }
          : doc
      ));

      // Also update selected document to reflect saved state
      setSelectedDocument(prev => prev ? {
        ...prev,
        document_content: editedContent,
        lawyer_comments: lawyerComments.trim() || prev.lawyer_comments,
        lawyer_comments_date: lawyerComments.trim() ? new Date().toISOString() : prev.lawyer_comments_date,
        updated_at: new Date().toISOString()
      } : null);

      toast({
        title: "Borrador guardado",
        description: "Los cambios han sido guardados. Puede seguir editando.",
      });

      // NO cerramos el panel - el usuario puede seguir editando

      // Refresh from server to ensure consistency
      await fetchDocuments();
    } catch (error) {
      console.error('Error saving document draft:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al guardar el borrador",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar al cliente: Guarda cambios, cambia estado a revision_usuario y cierra el panel
  const handleSendToClient = async () => {
    if (!selectedDocument || !editedContent) {
      toast({
        title: "Error",
        description: "No hay contenido para enviar",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const updateData: any = { 
        document_content: editedContent,
        reviewed_by_lawyer_id: user?.id,
        reviewed_by_lawyer_name: user?.name,
        status: 'revision_usuario',
        updated_at: new Date().toISOString()
      };

      // Add lawyer comments if provided
      if (lawyerComments.trim()) {
        updateData.lawyer_comments = lawyerComments.trim();
        updateData.lawyer_comments_date = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('document_tokens')
        .update(updateData)
        .eq('id', selectedDocument.id);

      if (error) {
        console.error('Error sending document to client:', error);
        toast({
          title: "Error",
          description: `No se pudo enviar el documento: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Document sent to client successfully');

      // Update local state immediately
      setDocuments(prev => prev.map(doc => 
        doc.id === selectedDocument.id 
          ? { 
              ...doc, 
              document_content: editedContent,
              lawyer_comments: lawyerComments.trim() || doc.lawyer_comments,
              lawyer_comments_date: lawyerComments.trim() ? new Date().toISOString() : doc.lawyer_comments_date,
              status: 'revision_usuario',
              updated_at: new Date().toISOString() 
            }
          : doc
      ));

      toast({
        title: "Documento enviado al cliente",
        description: "El cliente recibirá una notificación por correo electrónico.",
      });

      // Cerrar el panel de revisión y limpiar estados
      setSelectedDocument(null);
      setEditedContent("");
      setLawyerComments("");
      setSpellCheckResults(null);
      setShowSendConfirmation(false);

      // Refresh from server to ensure consistency
      await fetchDocuments();
    } catch (error) {
      console.error('Error sending document to client:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al enviar el documento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewPDF = () => {
    if (!selectedDocument || !editedContent) {
      toast({
        title: "Error",
        description: "No hay contenido para previsualizar",
        variant: "destructive",
      });
      return;
    }

    // Crear ventana de preview con el formato del PDF
    const previewWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Vista Previa PDF - ${selectedDocument.document_type}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              body {
                font-family: Arial, sans-serif;
                background: #e5e5e5;
                padding: 20px;
              }
              .pdf-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                padding: 40px 50px;
                min-height: 1000px;
                position: relative;
              }
              .header {
                border-bottom: 3px solid #172554;
                padding-bottom: 15px;
                margin-bottom: 30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .header h1 {
                color: #172554;
                font-size: 18px;
                font-weight: bold;
              }
              .header .page-number {
                color: #666;
                font-size: 12px;
              }
              .title {
                text-align: center;
                color: #172554;
                font-size: 22px;
                font-weight: bold;
                margin: 30px 0 40px 0;
                text-transform: uppercase;
              }
              .content {
                color: #000;
                font-size: 14px;
                line-height: 1.7;
                white-space: pre-line;
                text-align: justify;
              }
              .footer {
                position: fixed;
                bottom: 40px;
                left: 50px;
                right: 50px;
                border-top: 1px solid #ccc;
                padding-top: 15px;
                font-size: 11px;
                color: #666;
              }
              .footer-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
              }
              .footer-center {
                text-align: center;
                margin-top: 8px;
                font-size: 10px;
              }
              .watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 80px;
                color: rgba(200, 200, 200, 0.2);
                font-weight: bold;
                pointer-events: none;
                z-index: -1;
              }
              @media print {
                body {
                  background: white;
                  padding: 0;
                }
                .pdf-container {
                  box-shadow: none;
                  padding: 25mm 20mm;
                }
              }
            </style>
          </head>
          <body>
            <div class="watermark">VISTA PREVIA</div>
            <div class="pdf-container">
              <div class="header">
                <h1>TU CONSULTOR LEGAL</h1>
                <div class="page-number">Página 1</div>
              </div>
              
              <div class="title">${selectedDocument.document_type}</div>
              
              <div class="content">${editedContent}</div>
              
              <div class="footer">
                <div class="footer-row">
                  <span>Token: ${selectedDocument.token}</span>
                  <span>Generado: ${new Date().toLocaleDateString('es-ES')}</span>
                  <span style="color: #3b82f6;">www.tuconsultorlegal.co</span>
                </div>
                ${user?.name ? `<div style="margin-top: 5px; font-size: 10px;">Documento revisado por: ${user.name}</div>` : ''}
                <div class="footer-center">
                  Documento generado digitalmente por Tu Consultor Legal - Válido sin firma física
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      previewWindow.document.close();
      
      toast({
        title: "Vista previa generada",
        description: "Se ha abierto una vista previa del documento en una nueva ventana",
      });
    } else {
      toast({
        title: "Error",
        description: "No se pudo abrir la ventana de vista previa. Verifica que los pop-ups estén habilitados.",
        variant: "destructive",
      });
    }
  };

  const handleSpellCheck = async () => {
    if (!editedContent || editedContent.trim().length === 0) {
      toast({
        title: "Sin contenido",
        description: "No hay contenido para revisar",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCheckingSpelling(true);
      setSpellCheckResults(null);

      const { data, error } = await supabase.functions.invoke('spell-check-document', {
        body: { content: editedContent }
      });

      if (error) {
        console.error('Error checking spelling:', error);
        toast({
          title: "Error al revisar ortografía",
          description: error.message || "No se pudo completar la revisión ortográfica",
          variant: "destructive",
        });
        return;
      }

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setSpellCheckResults(data);
      
      if (data.errors && data.errors.length > 0) {
        toast({
          title: "Revisión completada",
          description: data.summary || `Se encontraron ${data.errors.length} errores`,
        });
      } else {
        toast({
          title: "¡Excelente!",
          description: "No se encontraron errores ortográficos ni gramaticales",
        });
      }
    } catch (error) {
      console.error('Error checking spelling:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al revisar la ortografía",
        variant: "destructive",
      });
    } finally {
      setIsCheckingSpelling(false);
    }
  };

  const applySpellCheckCorrections = () => {
    if (spellCheckResults && spellCheckResults.correctedText) {
      setEditedContent(spellCheckResults.correctedText);
      toast({
        title: "Correcciones aplicadas",
        description: "El texto ha sido corregido automáticamente. Revisa los cambios antes de guardar.",
      });
      setSpellCheckResults(null);
    }
  };

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

  // Show landing page if not authenticated as lawyer
  if (!isAuthenticated) {
    return <LawyerLandingPage onOpenChat={onOpenChat} />;
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

  // If not dashboard view, show module content directly (modules already have their own sidebar)
  if (currentView !== 'dashboard') {
    return (
      <>
        {/* Confirmation Dialog for Sending to Client */}
        <AlertDialog open={showSendConfirmation} onOpenChange={setShowSendConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Enviar documento al cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                El documento será enviado al cliente para su revisión y pago. El cliente recibirá una notificación por correo electrónico con un enlace para acceder al documento.
                <br /><br />
                <strong>Esta acción cambiará el estado del documento a "Revisión Usuario".</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSendToClient}>
                Sí, Enviar al Cliente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modules already have their own SidebarProvider and UnifiedSidebar */}
        {renderModuleContent()}
      </>
    );
  }

  return (
    <>
      {/* Confirmation Dialog for Sending to Client */}
      <AlertDialog open={showSendConfirmation} onOpenChange={setShowSendConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar documento al cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              El documento será enviado al cliente para su revisión y pago. El cliente recibirá una notificación por correo electrónico con un enlace para acceder al documento.
              <br /><br />
              <strong>Esta acción cambiará el estado del documento a "Revisión Usuario".</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendToClient}>
              Sí, Enviar al Cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar 
          className={`${isMobile ? 'w-14' : 'w-64'} transition-all duration-300 border-r flex-shrink-0`}
          data-tour="lawyer-sidebar"
          collapsible={isMobile ? "icon" : "none"}
          variant="inset"
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

              {/* 🔴 URGENT DOCUMENTS - Documents at risk or overdue */}
              {documents.filter(doc => doc.sla_status === 'overdue' || doc.sla_status === 'at_risk').length > 0 && (
                <div className="mb-6">
                  <Card className="border-2 border-red-500 bg-red-50 dark:bg-red-950/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertCircle className="h-5 w-5 animate-pulse" />
                        Documentos Urgentes
                        <Badge variant="destructive" className="ml-2">
                          {documents.filter(doc => doc.sla_status === 'overdue' || doc.sla_status === 'at_risk').length}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-red-600 dark:text-red-400">
                        Estos documentos requieren tu atención inmediata
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {documents
                          .filter(doc => doc.sla_status === 'overdue' || doc.sla_status === 'at_risk')
                          .map((doc) => (
                            <Card 
                              key={doc.id} 
                              className={`border-2 hover:shadow-lg transition-all cursor-pointer ${
                                doc.sla_status === 'overdue' 
                                  ? 'border-red-500 bg-red-50/50 dark:bg-red-950/10' 
                                  : 'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/10'
                              }`}
                              onClick={() => handleDocumentClick(doc)}
                            >
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base md:text-lg flex items-center justify-between">
                                  <span className="truncate flex items-center gap-2">
                                    {doc.sla_status === 'overdue' && (
                                      <AlertCircle className="h-4 w-4 text-red-500" />
                                    )}
                                    {doc.document_type}
                                  </span>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Badge variant={getStatusVariant(doc.status)}>
                                      {getStatusText(doc.status)}
                                    </Badge>
                                    <Badge variant={getSlaStatusVariant(doc.sla_status)}>
                                      {getSlaStatusText(doc.sla_status)}
                                    </Badge>
                                  </div>
                                </CardTitle>
                                <CardDescription className="text-xs md:text-sm">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {doc.user_name || 'Usuario anónimo'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(doc.created_at).toLocaleDateString()}
                                    </span>
                                    {doc.sla_deadline && (
                                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                                        <Clock className="h-3 w-3" />
                                        Límite: {new Date(doc.sla_deadline).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </CardDescription>
                              </CardHeader>
                            </Card>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 📄 ALL PENDING DOCUMENTS */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
                    Documentos Pendientes
                  </h2>
                  {documents.length > 0 && (
                    <Badge variant="secondary" className="text-sm">
                      {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
                    </Badge>
                  )}
                </div>
                
                {documents.length === 0 ? (
                  <Card className="border-dashed border-2">
                    <CardContent className="p-8 md:p-12 text-center">
                      <CheckCircle className="h-12 w-12 md:h-16 md:w-16 text-green-500 mx-auto mb-3 md:mb-4" />
                      <h3 className="text-base md:text-lg font-medium mb-2 text-green-700 dark:text-green-400">
                        ¡Todo al día!
                      </h3>
                      <p className="text-sm md:text-base text-muted-foreground">
                        No hay documentos pendientes de revisión
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {documents.map((doc) => (
                      <Card 
                        key={doc.id} 
                        className={`border hover:border-primary hover:shadow-md transition-all cursor-pointer ${
                          doc.sla_status === 'at_risk' ? 'border-l-4 border-l-yellow-400' :
                          doc.sla_status === 'overdue' ? 'border-l-4 border-l-red-500' :
                          'border-l-4 border-l-green-400'
                        }`}
                        onClick={() => handleDocumentClick(doc)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base md:text-lg flex items-center justify-between">
                            <span className="truncate">{doc.document_type}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
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
                          <CardDescription className="text-xs md:text-sm">
                            <div className="flex items-center gap-3 flex-wrap">
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
                              {doc.sla_deadline && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(doc.sla_deadline).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Document Review Panel - Prioritized Position */}
              {selectedDocument && (
                <div className="space-y-6 mb-6" data-tour="document-details">
                  <Card className="border-2 border-primary shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Revisión de Documento
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedDocument(null);
                            setEditedContent("");
                            setLawyerComments("");
                          }}
                        >
                          Cerrar
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        Revisa y modifica el documento antes de enviarlo al cliente
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="text-sm font-medium">Token:</label>
                            <p className="text-sm">{selectedDocument.token}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Tipo de documento:</label>
                            <p className="text-sm">{selectedDocument.document_type}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Usuario:</label>
                            <p className="text-sm">{selectedDocument.user_name || 'Usuario anónimo'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Email:</label>
                            <p className="text-sm">{selectedDocument.user_email || 'No proporcionado'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Estado:</label>
                            <Badge variant={getStatusVariant(selectedDocument.status)}>
                              {getStatusText(selectedDocument.status)}
                            </Badge>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Precio:</label>
                            <p className="text-sm font-semibold">${selectedDocument.price.toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Show user observations if present */}
                        {selectedDocument.user_observations && (
                          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <div className="flex items-start gap-2 mb-2">
                              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                                  Observaciones del Cliente
                                </h4>
                                <p className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">
                                  {selectedDocument.user_observations}
                                </p>
                                {selectedDocument.user_observation_date && (
                                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                                    Enviado: {new Date(selectedDocument.user_observation_date).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium">
                              Contenido revisado (modifica según sea necesario):
                            </label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handlePreviewPDF}
                              className="flex items-center gap-2"
                            >
                              <FileImage className="h-4 w-4" />
                              Vista Previa PDF
                            </Button>
                          </div>
                          <Textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            placeholder="Revisa y edita el contenido del documento según sea necesario..."
                            className="min-h-[200px] font-mono text-sm"
                          />
                        </div>

                        {/* Lawyer Comments Section */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Comentarios para el cliente (opcional):
                          </label>
                          <Textarea
                            value={lawyerComments}
                            onChange={(e) => setLawyerComments(e.target.value)}
                            placeholder="Escribe aquí cualquier comentario sobre los cambios realizados al documento que quieras que el cliente vea..."
                            className="min-h-[100px] text-sm"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Estos comentarios serán visibles para el cliente junto con el documento revisado.
                          </p>
                        </div>
                        
                        {/* Spell Check Section */}
                        <div className="border-t pt-4 mt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <SpellCheck className="h-4 w-4" />
                              Revisor Ortográfico Automático
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSpellCheck}
                              disabled={isCheckingSpelling || !editedContent.trim()}
                              className="flex items-center gap-2"
                            >
                              {isCheckingSpelling ? (
                                <>
                                  <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                                  Revisando...
                                </>
                              ) : (
                                <>
                                  <SpellCheck className="h-3 w-3" />
                                  Revisar Ortografía
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Spell Check Results */}
                          {spellCheckResults && (
                            <div className="space-y-3">
                              <div className="bg-muted/50 p-3 rounded-lg">
                                <p className="text-sm font-medium mb-2">{spellCheckResults.summary}</p>
                                
                                {spellCheckResults.errors.length > 0 && (
                                  <>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                      {spellCheckResults.errors.map((error, index) => (
                                        <div key={index} className="bg-background p-2 rounded border text-sm">
                                          <div className="flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                              <p className="font-medium text-destructive">"{error.word}"</p>
                                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                                Contexto: ...{error.context}...
                                              </p>
                                              {error.suggestions.length > 0 && (
                                                <p className="text-xs mt-1">
                                                  <span className="text-muted-foreground">Sugerencias:</span>{' '}
                                                  <span className="text-primary">
                                                    {error.suggestions.join(', ')}
                                                  </span>
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    
                                    <div className="flex gap-2 mt-3">
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={applySpellCheckCorrections}
                                        className="flex items-center gap-2"
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                        Aplicar Correcciones Automáticas
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSpellCheckResults(null)}
                                      >
                                        Cerrar
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button 
                            onClick={handleSaveDraft}
                            disabled={isLoading}
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <Save className="h-4 w-4" />
                            {selectedDocument.document_content === editedContent && selectedDocument.lawyer_comments === lawyerComments ? 'Borrador Guardado' : 'Guardar Borrador'}
                          </Button>
                          <Button
                            variant="default"
                            onClick={() => setShowSendConfirmation(true)}
                            disabled={isLoading}
                            className="flex items-center gap-2"
                          >
                            <Send className="h-4 w-4" />
                            Enviar al Cliente
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedDocument(null);
                              setEditedContent("");
                              setLawyerComments("");
                              setSpellCheckResults(null);
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 🛠️ QUICK ACCESS TOOLS */}
              {user?.canUseAiTools && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className="h-5 w-5 text-amber-500" />
                    <h2 className="text-lg md:text-xl font-semibold">Herramientas Rápidas</h2>
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                      PREMIUM ACTIVO
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                      { title: "Investigación", icon: Search, view: "research", gradient: "from-blue-500 to-cyan-500" },
                      { title: "Análisis", icon: Eye, view: "analyze", gradient: "from-purple-500 to-pink-500" },
                      { title: "Redacción", icon: PenTool, view: "draft", gradient: "from-green-500 to-emerald-500" },
                      { title: "Estrategia", icon: Target, view: "strategize", gradient: "from-orange-500 to-red-500" },
                      { title: "CRM", icon: Users, view: "crm", gradient: "from-blue-500 to-indigo-500" }
                    ].map((tool) => (
                      <Card 
                        key={tool.view} 
                        className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-0"
                        onClick={() => setCurrentView(tool.view as any)}
                      >
                        <CardContent className="p-4 text-center">
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${tool.gradient} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-300`}>
                            <tool.icon className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="font-semibold text-sm">{tool.title}</h3>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* 🎓 PROFESSIONAL DEVELOPMENT */}
              <div className="mb-6">
                <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-pink-500" />
                  Desarrollo Profesional
                </h2>
                <Card 
                  className="group cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-lg border-0 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20"
                  onClick={() => setCurrentView('training')}
                >
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Brain className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base md:text-lg mb-1">Formación IA</h3>
                        <p className="text-sm text-muted-foreground">Certifícate en el uso de herramientas de IA legal</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ⚙️ ADMINISTRATION - Compact Section */}
              <details className="group mb-6">
                <summary className="flex items-center gap-2 cursor-pointer list-none hover:text-primary transition-colors">
                  <Settings className="h-5 w-5 text-gray-500" />
                  <h2 className="text-lg md:text-xl font-semibold">Administración</h2>
                  <span className="ml-auto text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                </summary>
                
                <div className="mt-4 space-y-4">
                  {/* Agent Management */}
                  {user?.canCreateAgents && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Bot className="h-4 w-4 text-purple-500" />
                        <h3 className="text-base font-medium">Gestión IA</h3>
                        <Badge variant="secondary" className="text-xs">ADMIN</Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { title: "Crear Agente", icon: Bot, view: "agent-creator", color: "purple" },
                          { title: "Gestionar Agentes", icon: Settings, view: "agent-manager", color: "indigo" },
                          { title: "Métricas", icon: BarChart3, view: "stats", color: "emerald" }
                        ].map((item) => (
                          <Card 
                            key={item.view}
                            className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md"
                            onClick={() => setCurrentView(item.view as any)}
                          >
                            <CardContent className="p-4 text-center">
                              <div className={`w-10 h-10 rounded-full bg-${item.color}-100 dark:bg-${item.color}-900/30 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                                <item.icon className={`h-5 w-5 text-${item.color}-600 dark:text-${item.color}-400`} />
                              </div>
                              <h4 className="font-semibold text-sm">{item.title}</h4>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Blog Management */}
                  {user?.canCreateBlogs && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="h-4 w-4 text-green-500" />
                        <h3 className="text-base font-medium">Gestión de Contenido</h3>
                      </div>
                      <Card 
                        className="group cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-md"
                        onClick={() => setCurrentView('blog-manager')}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm md:text-base">Gestión de Blog</h4>
                              <p className="text-xs text-muted-foreground">Crea y administra contenido legal</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </details>

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
      
      {/* Change Email Dialog */}
      <LawyerChangeEmailDialog 
        open={showChangeEmailDialog}
        onOpenChange={setShowChangeEmailDialog}
      />
    </SidebarProvider>
    </>
  );
};