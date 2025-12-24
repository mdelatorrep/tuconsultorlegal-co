import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLawyerAuth } from "@/hooks/useLawyerAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Save, CheckCircle, Bot, Settings, Brain, BookOpen, Search, Eye, PenTool, Target, Crown, Users, SpellCheck, AlertCircle, Clock, FileImage, Send, Database, Radar, Wand2, Mic, TrendingUp, UserCircle, Calendar, Mail } from "lucide-react";

import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Module imports
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
import SuinJuriscolModule from "./lawyer-modules/SuinJuriscolModule";
import ProcessQueryModule from "./lawyer-modules/ProcessQueryModule";
import { ProcessMonitorModule } from "./lawyer-modules/ProcessMonitorModule";
import { CasePredictorModule } from "./lawyer-modules/CasePredictorModule";
import LawyerVerificationModule from "./lawyer-modules/LawyerVerificationModule";
import { SmartLegalCalendar, DeadlineCalculator, AutoDocketing } from "./calendar";
import { LegalCopilot } from "./copilot";
import { VoiceAssistant } from "./voice";
import { ClientPortalPage } from "./client-portal";
import PremiumFeatureCard from "./PremiumFeatureCard";
import LawyerOnboardingCoachmarks from "./LawyerOnboardingCoachmarks";
import { useLawyerOnboarding } from "@/hooks/useLawyerOnboarding";
import { LawyerChangeEmailDialog } from "./LawyerChangeEmailDialog";
import LawyerPublicProfileEditor from "./LawyerPublicProfileEditor";
import UnifiedSidebar from "./UnifiedSidebar";
import { CreditsDashboard } from "./credits/CreditsDashboard";
import { NextBestAction } from "./credits/NextBestAction";
import { DailyProgress } from "./credits/DailyProgress";
import { GamificationDashboard } from "./gamification/GamificationDashboard";
import { QuickActionsBar } from "./QuickActionsBar";
import { useCredits } from "@/hooks/useCredits";
import { ToolCostIndicator } from "@/components/credits/ToolCostIndicator";
import { SpecializedAgentsGrid } from "./lawyer-modules/SpecializedAgentsGrid";
import { SpecializedAgentChat } from "./lawyer-modules/SpecializedAgentChat";
import { NotificationCenter } from "./notifications/NotificationCenter";

// Dashboard components
import { 
  DashboardWelcome, 
  UrgentDocumentsSection, 
  NewLeadsNotification, 
  PendingDocumentsList,
  QuickToolsGrid 
} from "./dashboard";

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

// ReactQuill configuration
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    [{ 'color': [] }, { 'background': [] }],
    ['clean']
  ],
};

const quillFormats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'align', 'color', 'background'
];

type ViewType = 'dashboard' | 'stats' | 'agent-creator' | 'agent-manager' | 'training' | 'blog-manager' | 'research' | 'analyze' | 'draft' | 'strategize' | 'crm' | 'public-profile' | 'suin-juriscol' | 'process-query' | 'credits' | 'gamification' | 'process-monitor' | 'legal-calendar' | 'legal-copilot' | 'voice-assistant' | 'case-predictor' | 'client-portal' | 'lawyer-verification' | 'request-agent-access' | 'request-blog-access' | 'specialized-agents';

export default function LawyerDashboardPage({ onOpenChat }: LawyerDashboardPageProps) {
  const [documents, setDocuments] = useState<DocumentToken[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentToken | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [lawyerComments, setLawyerComments] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedSpecializedAgent, setSelectedSpecializedAgent] = useState<any>(null);
  const [isCheckingSpelling, setIsCheckingSpelling] = useState(false);
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const [newLeadsCount, setNewLeadsCount] = useState(0);
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
  
  const [showChangeEmailDialog, setShowChangeEmailDialog] = useState(false);
  
  const { 
    shouldShowOnboarding, 
    isLoading: onboardingLoading, 
    markOnboardingCompleted, 
    skipOnboarding 
  } = useLawyerOnboarding(user?.id);

  // Credits hook for spell check
  const { consumeCredits, hasEnoughCredits } = useCredits(user?.id || null);

  // Helper functions
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
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

  const getSlaStatusVariant = (slaStatus?: string): "default" | "secondary" | "destructive" | "outline" => {
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

  // Fetch documents and leads
  useEffect(() => {
    if (isAuthenticated) {
      fetchDocuments();
      fetchNewLeadsCount();
      
      const documentChannel = supabase
        .channel('document-tokens-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'document_tokens',
            filter: 'status=in.(solicitado,revision_usuario,en_revision_abogado)'
          },
          () => fetchDocuments()
        )
        .subscribe();

      const leadsChannel = supabase
        .channel('crm-leads-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'crm_leads',
            filter: `lawyer_id=eq.${user?.id}`
          },
          () => fetchNewLeadsCount()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(documentChannel);
        supabase.removeChannel(leadsChannel);
      };
    }
  }, [isAuthenticated, user?.id]);

  const fetchDocuments = async () => {
    try {
      if (!user?.id) {
        setDocuments([]);
        setIsLoading(false);
        return;
      }

      const { data: lawyerAgents, error: agentsError } = await supabase
        .from('legal_agents')
        .select('name')
        .eq('created_by', user.id)
        .in('status', ['active', 'approved']);

      if (agentsError || !lawyerAgents || lawyerAgents.length === 0) {
        setDocuments([]);
        setIsLoading(false);
        return;
      }

      const { data: allDocuments, error: documentsError } = await supabase
        .from('document_tokens')
        .select('*')
        .in('status', ['solicitado', 'revision_usuario', 'en_revision_abogado'])
        .order('created_at', { ascending: false });

      if (documentsError) {
        setDocuments([]);
        setIsLoading(false);
        return;
      }

      const agentNames = lawyerAgents.map(agent => agent.name.toLowerCase().trim());
      
      const filteredDocuments = allDocuments?.filter(doc => {
        const docType = doc.document_type.toLowerCase().trim();
        return agentNames.some(agentName => 
          docType === agentName || 
          docType.includes(agentName) || 
          agentName.includes(docType) ||
          (docType.includes('arrendamiento') && agentName.includes('arrendamiento'))
        );
      }) || [];

      setDocuments(filteredDocuments);
    } catch (error) {
      console.error('Error:', error);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNewLeadsCount = async () => {
    try {
      if (!user?.id) return;

      const { count, error } = await supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .eq('lawyer_id', user.id)
        .eq('status', 'new');

      if (!error) {
        setNewLeadsCount(count || 0);
      }
    } catch (error) {
      console.error('Error:', error);
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

  const handleSaveDraft = async () => {
    if (!selectedDocument || !editedContent) {
      toast({ title: "Error", description: "No hay contenido para guardar", variant: "destructive" });
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

      if (lawyerComments.trim()) {
        updateData.lawyer_comments = lawyerComments.trim();
        updateData.lawyer_comments_date = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('document_tokens')
        .update(updateData)
        .eq('id', selectedDocument.id);

      if (error) {
        toast({ title: "Error", description: `No se pudo guardar el borrador: ${error.message}`, variant: "destructive" });
        return;
      }

      setDocuments(prev => prev.map(doc => 
        doc.id === selectedDocument.id 
          ? { ...doc, document_content: editedContent, lawyer_comments: lawyerComments.trim() || doc.lawyer_comments, updated_at: new Date().toISOString() }
          : doc
      ));

      setSelectedDocument(prev => prev ? { ...prev, document_content: editedContent, updated_at: new Date().toISOString() } : null);

      toast({ title: "Borrador guardado", description: "Los cambios han sido guardados." });
      await fetchDocuments();
    } catch (error) {
      toast({ title: "Error", description: "Ocurrió un error inesperado", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendToClient = async () => {
    if (!selectedDocument || !editedContent) {
      toast({ title: "Error", description: "No hay contenido para enviar", variant: "destructive" });
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

      if (lawyerComments.trim()) {
        updateData.lawyer_comments = lawyerComments.trim();
        updateData.lawyer_comments_date = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('document_tokens')
        .update(updateData)
        .eq('id', selectedDocument.id);

      if (error) {
        toast({ title: "Error", description: `No se pudo enviar el documento: ${error.message}`, variant: "destructive" });
        return;
      }

      try {
        await supabase.functions.invoke('notify-document-status-change', {
          body: { document_token_id: selectedDocument.id, new_status: 'revision_usuario', old_status: selectedDocument.status }
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }

      setDocuments(prev => prev.map(doc => 
        doc.id === selectedDocument.id 
          ? { ...doc, document_content: editedContent, status: 'revision_usuario', updated_at: new Date().toISOString() }
          : doc
      ));

      toast({ title: "Documento enviado al cliente", description: "El cliente recibirá una notificación por correo electrónico." });

      setSelectedDocument(null);
      setEditedContent("");
      setLawyerComments("");
      setSpellCheckResults(null);
      setShowSendConfirmation(false);

      await fetchDocuments();
    } catch (error) {
      toast({ title: "Error", description: "Ocurrió un error inesperado", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewPDF = () => {
    if (!selectedDocument || !editedContent) {
      toast({ title: "Error", description: "No hay contenido para previsualizar", variant: "destructive" });
      return;
    }

    import('@/utils/htmlSanitizer').then(({ sanitizeHtml }) => {
      const sanitizedContent = sanitizeHtml(editedContent);
      const previewWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
      if (previewWindow) {
        previewWindow.document.write(`
          <!DOCTYPE html>
          <html lang="es">
            <head>
              <meta charset="UTF-8">
              <title>Vista Previa - ${selectedDocument.document_type}</title>
              <style>
                body { font-family: "Times New Roman", Times, serif; background: #e5e5e5; padding: 20px; }
                .pdf-container { max-width: 800px; margin: 0 auto; background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.15); padding: 60px 50px 80px; min-height: 1000px; }
                .content { font-size: 12pt; line-height: 1.7; text-align: justify; }
              </style>
            </head>
            <body>
              <div class="pdf-container">
                <div class="content">${sanitizedContent}</div>
              </div>
            </body>
          </html>
        `);
        previewWindow.document.close();
        toast({ title: "Vista previa generada", description: "Se ha abierto una vista previa del documento" });
      }
    });
  };

  const handleSpellCheck = async () => {
    if (!editedContent || editedContent.trim().length === 0) {
      toast({ title: "Sin contenido", description: "No hay contenido para revisar", variant: "destructive" });
      return;
    }

    // Check credits before proceeding
    if (!hasEnoughCredits('spell_check')) {
      toast({ 
        title: "Créditos insuficientes", 
        description: "No tienes suficientes créditos para usar el corrector ortográfico", 
        variant: "destructive" 
      });
      return;
    }

    try {
      setIsCheckingSpelling(true);
      setSpellCheckResults(null);

      // Consume credits before API call
      const creditResult = await consumeCredits('spell_check', { contentLength: editedContent.length });
      if (!creditResult.success) {
        toast({ 
          title: "Error de créditos", 
          description: creditResult.error || "No se pudieron consumir los créditos", 
          variant: "destructive" 
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('spell-check-document', {
        body: { content: editedContent }
      });

      if (error || data.error) {
        toast({ title: "Error", description: error?.message || data?.error, variant: "destructive" });
        return;
      }

      setSpellCheckResults(data);
      
      if (data.errors?.length > 0) {
        toast({ title: "Revisión completada", description: data.summary || `Se encontraron ${data.errors.length} errores` });
      } else {
        toast({ title: "¡Excelente!", description: "No se encontraron errores ortográficos" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Ocurrió un error al revisar la ortografía", variant: "destructive" });
    } finally {
      setIsCheckingSpelling(false);
    }
  };

  const applySpellCheckCorrections = () => {
    if (spellCheckResults?.correctedText) {
      setEditedContent(spellCheckResults.correctedText);
      toast({ title: "Correcciones aplicadas", description: "El texto ha sido corregido automáticamente." });
      setSpellCheckResults(null);
    }
  };

  // Loading state
  if (authLoading || onboardingLoading) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - show landing
  if (!isAuthenticated) {
    return <LawyerLandingPage onOpenChat={onOpenChat} />;
  }

  // Render module content
  const renderModuleContent = () => {
    switch (currentView) {
      case 'agent-creator':
        return <AgentCreatorPage user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as ViewType)} onLogout={logout} lawyerData={user} />;
      case 'agent-manager':
        return <AgentManagerPage user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as ViewType)} onLogout={logout} lawyerData={user} />;
      case 'blog-manager':
        return <LawyerBlogManager onBack={() => setCurrentView('dashboard')} lawyerData={user} />;
      case 'training':
        return <LawyerTrainingPage user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as ViewType)} onLogout={logout} lawyerData={user} />;
      case 'public-profile':
        return <LawyerPublicProfileEditor lawyerId={user.id} lawyerName={user.name} />;
      case 'research':
        return <ResearchModule user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as ViewType)} onLogout={logout} />;
      case 'suin-juriscol':
        return <SuinJuriscolModule user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as ViewType)} onLogout={logout} />;
      case 'process-query':
        return <ProcessQueryModule user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as ViewType)} onLogout={logout} />;
      case 'analyze':
        return <AnalyzeModule user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as ViewType)} onLogout={logout} />;
      case 'draft':
        return <DraftModule user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as ViewType)} onLogout={logout} />;
      case 'strategize':
        return <StrategizeModule user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as ViewType)} onLogout={logout} />;
      case 'stats':
        return <LawyerStatsSection user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as ViewType)} onLogout={logout} />;
      case 'crm':
        return <CRMModule user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as ViewType)} onLogout={logout} />;
      case 'process-monitor':
        return <ProcessMonitorModule lawyerId={user.id} />;
      case 'legal-calendar':
        return (
          <div className="space-y-6 p-6">
            <SmartLegalCalendar lawyerId={user.id} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DeadlineCalculator lawyerId={user.id} />
              <AutoDocketing lawyerId={user.id} />
            </div>
          </div>
        );
      case 'legal-copilot':
        return <LegalCopilot lawyerId={user.id} />;
      case 'voice-assistant':
        return <VoiceAssistant lawyerId={user.id} />;
      case 'case-predictor':
        return <CasePredictorModule lawyerId={user.id} />;
      case 'client-portal':
        return <ClientPortalPage lawyerId={user.id} />;
      case 'lawyer-verification':
        return <LawyerVerificationModule lawyerId={user.id} />;
      case 'request-agent-access':
        return (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <Bot className="h-16 w-16 mx-auto mb-4 text-primary" />
                <CardTitle>Gestión de Agentes IA</CardTitle>
                <CardDescription>
                  Para crear y gestionar agentes de IA personalizados, necesitas solicitar acceso al administrador.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Una vez aprobado, podrás crear agentes de documentos, gestionar sus configuraciones y ver métricas de uso.
                </p>
                <Button onClick={() => toast({ title: "Solicitud enviada", description: "Te contactaremos pronto." })}>
                  <Mail className="h-4 w-4 mr-2" />
                  Solicitar Acceso
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      case 'request-blog-access':
        return (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-primary" />
                <CardTitle>Gestión de Blog</CardTitle>
                <CardDescription>
                  Para publicar artículos en el blog, necesitas solicitar acceso al administrador.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Una vez aprobado, podrás crear, editar y publicar artículos legales para compartir tu conocimiento.
                </p>
                <Button onClick={() => toast({ title: "Solicitud enviada", description: "Te contactaremos pronto." })}>
                  <Mail className="h-4 w-4 mr-2" />
                  Solicitar Acceso
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      case 'specialized-agents':
        if (selectedSpecializedAgent) {
          return (
            <SpecializedAgentChat
              agent={selectedSpecializedAgent}
              lawyerId={user.id}
              onBack={() => setSelectedSpecializedAgent(null)}
            />
          );
        }
        return (
          <SpecializedAgentsGrid
            lawyerId={user.id}
            onSelectAgent={(agent) => setSelectedSpecializedAgent(agent)}
          />
        );
      default:
        return null;
    }
  };

  // Views that use full layout with sidebar
  const viewsWithSidebar = ['dashboard', 'public-profile', 'stats', 'credits', 'gamification', 'request-agent-access', 'request-blog-access'];
  
  // Views that modules render their own sidebar (need to be wrapped)
  const moduleViews = ['agent-creator', 'agent-manager', 'training', 'blog-manager', 'research', 'analyze', 'draft', 'strategize', 'crm', 'suin-juriscol', 'process-query', 'process-monitor', 'legal-calendar', 'legal-copilot', 'voice-assistant', 'case-predictor', 'client-portal', 'lawyer-verification', 'specialized-agents'];

  // If it's a module view, wrap it with our SidebarProvider
  if (moduleViews.includes(currentView)) {
    return (
      <>
        <AlertDialog open={showSendConfirmation} onOpenChange={setShowSendConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Enviar documento al cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                El documento será enviado al cliente para su revisión y pago.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSendToClient}>Sí, Enviar al Cliente</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background">
            <UnifiedSidebar 
              user={user}
              currentView={currentView}
              onViewChange={(view) => setCurrentView(view as ViewType)}
              onLogout={logout}
            />
            <main className="flex-1 min-w-0 overflow-auto">
              <header className="h-12 md:h-14 border-b bg-background/95 backdrop-blur sticky top-0 z-40">
                <div className="flex h-full items-center justify-between px-3 md:px-4">
                  <div className="flex items-center gap-2 md:gap-4">
                    <SidebarTrigger />
                    <Button variant="ghost" size="sm" onClick={() => setCurrentView('dashboard')}>
                      ← Dashboard
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <NotificationCenter 
                      lawyerId={user.id} 
                      onNavigate={(url) => {
                        if (url.includes('crm')) setCurrentView('crm');
                        else if (url.includes('credits')) setCurrentView('credits');
                        else if (url.includes('process')) setCurrentView('process-monitor');
                      }}
                    />
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                      Portal Abogados
                    </Badge>
                  </div>
                </div>
              </header>
              <div className="p-4">
                {renderModuleContent()}
              </div>
            </main>
          </div>
        </SidebarProvider>
      </>
    );
  }

  // Dashboard and simple views
  return (
    <>
      <AlertDialog open={showSendConfirmation} onOpenChange={setShowSendConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar documento al cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              El documento será enviado al cliente para su revisión y pago.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendToClient}>Sí, Enviar al Cliente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <UnifiedSidebar 
            user={user}
            currentView={currentView}
            onViewChange={(view) => setCurrentView(view as ViewType)}
            onLogout={logout}
          />

          <main className="flex-1 min-w-0 overflow-auto">
            <header className="h-12 md:h-14 border-b bg-background/95 backdrop-blur sticky top-0 z-40">
              <div className="flex h-full items-center justify-between px-3 md:px-4">
                <div className="flex items-center gap-2 md:gap-4">
                  <SidebarTrigger />
                  <h1 className="font-semibold truncate text-sm md:text-base lg:text-lg">Dashboard Legal</h1>
                </div>
                <div className="flex items-center gap-2">
                  <NotificationCenter 
                    lawyerId={user.id} 
                    onNavigate={(url) => {
                      if (url.includes('crm')) setCurrentView('crm');
                      else if (url.includes('credits')) setCurrentView('credits');
                      else if (url.includes('process')) setCurrentView('process-monitor');
                    }}
                  />
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                    Portal Abogados
                  </Badge>
                </div>
              </div>
            </header>

            <div className="container mx-auto px-3 md:px-4 lg:px-6 py-3 md:py-4 lg:py-6">
              {currentView === 'credits' ? (
                <CreditsDashboard lawyerId={user.id} />
              ) : currentView === 'gamification' ? (
                <GamificationDashboard lawyerId={user.id} />
              ) : currentView === 'public-profile' ? (
                <LawyerPublicProfileEditor lawyerId={user.id} lawyerName={user.name} />
              ) : currentView === 'stats' ? (
                <LawyerStatsSection user={user} currentView={currentView} onViewChange={(view) => setCurrentView(view as ViewType)} onLogout={logout} />
              ) : (
                <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 lg:space-y-8">
                  {/* Header with Welcome + Daily Progress */}
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2" data-tour="dashboard-welcome">
                      <DashboardWelcome 
                        userName={user?.name || 'Usuario'} 
                        onViewCredits={() => setCurrentView('credits')} 
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <DailyProgress lawyerId={user.id} onViewCredits={() => setCurrentView('credits')} />
                    </div>
                  </div>

                  {/* Next Best Action */}
                  <NextBestAction
                    overdueDocuments={documents.filter(doc => doc.sla_status === 'overdue').map(d => ({ id: d.id, token: d.token, document_type: d.document_type, status: d.status, sla_status: d.sla_status, sla_deadline: d.sla_deadline, user_name: d.user_name || undefined, created_at: d.created_at }))}
                    atRiskDocuments={documents.filter(doc => doc.sla_status === 'at_risk').map(d => ({ id: d.id, token: d.token, document_type: d.document_type, status: d.status, sla_status: d.sla_status, sla_deadline: d.sla_deadline, user_name: d.user_name || undefined, created_at: d.created_at }))}
                    pendingDocuments={documents.filter(doc => doc.status === 'pagado' && doc.sla_status !== 'overdue' && doc.sla_status !== 'at_risk').map(d => ({ id: d.id, token: d.token, document_type: d.document_type, status: d.status, sla_status: d.sla_status, sla_deadline: d.sla_deadline, user_name: d.user_name || undefined, created_at: d.created_at }))}
                    newLeadsCount={newLeadsCount}
                    incompleteMissions={0}
                    onViewDocument={(doc) => {
                      const fullDoc = documents.find(d => d.id === doc.id);
                      if (fullDoc) handleDocumentClick(fullDoc);
                    }}
                    onViewCRM={() => setCurrentView('crm')}
                    onViewMissions={() => setCurrentView('credits')}
                  />

                  {/* Urgent Documents */}
                  <UrgentDocumentsSection
                    documents={documents}
                    onDocumentClick={handleDocumentClick}
                    getStatusVariant={getStatusVariant}
                    getStatusText={getStatusText}
                    getSlaStatusVariant={getSlaStatusVariant}
                    getSlaStatusText={getSlaStatusText}
                  />

                  {/* New Leads Notification */}
                  <NewLeadsNotification 
                    count={newLeadsCount} 
                    onViewCRM={() => setCurrentView('crm')} 
                  />

                  {/* Pending Documents */}
                  <PendingDocumentsList
                    documents={documents}
                    selectedDocumentId={selectedDocument?.id}
                    onDocumentClick={handleDocumentClick}
                    getStatusVariant={getStatusVariant}
                    getStatusText={getStatusText}
                    getSlaStatusVariant={getSlaStatusVariant}
                    getSlaStatusText={getSlaStatusText}
                  />

                  {/* Document Review Panel */}
                  {selectedDocument && (
                    <Card className="border-primary/50 shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          Revisando: {selectedDocument.document_type}
                        </CardTitle>
                        <CardDescription>
                          Token: {selectedDocument.token} | Cliente: {selectedDocument.user_name || 'Anónimo'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* User observations */}
                        {selectedDocument.user_observations && (
                          <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                            <h4 className="font-medium text-primary mb-2">Observaciones del cliente:</h4>
                            <p className="text-sm">{selectedDocument.user_observations}</p>
                          </div>
                        )}

                        {/* Editor */}
                        <div className="min-h-[300px] border rounded-lg">
                          <ReactQuill
                            value={editedContent}
                            onChange={setEditedContent}
                            modules={quillModules}
                            formats={quillFormats}
                            className="h-[250px]"
                          />
                        </div>

                        {/* Lawyer comments */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">Comentarios para el cliente (opcional):</label>
                          <Textarea
                            value={lawyerComments}
                            onChange={(e) => setLawyerComments(e.target.value)}
                            placeholder="Escribe comentarios sobre los cambios realizados..."
                            className="min-h-[100px]"
                          />
                        </div>

                        {/* Spell check section */}
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <SpellCheck className="h-4 w-4" />
                              Revisor Ortográfico
                              <ToolCostIndicator toolType="spell_check" lawyerId={user?.id} />
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSpellCheck}
                              disabled={isCheckingSpelling || !editedContent.trim() || !hasEnoughCredits('spell_check')}
                            >
                              {isCheckingSpelling ? 'Revisando...' : 'Revisar Ortografía'}
                            </Button>
                          </div>

                          {spellCheckResults && spellCheckResults.errors.length > 0 && (
                            <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                              <p className="text-sm font-medium">{spellCheckResults.summary}</p>
                              <Button size="sm" onClick={applySpellCheckCorrections}>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Aplicar Correcciones
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3">
                          <Button onClick={handleSaveDraft} disabled={isLoading} variant="outline">
                            <Save className="h-4 w-4 mr-2" />
                            Guardar Borrador
                          </Button>
                          <Button onClick={handlePreviewPDF} variant="outline">
                            <FileImage className="h-4 w-4 mr-2" />
                            Vista Previa
                          </Button>
                          <Button onClick={() => setShowSendConfirmation(true)} disabled={isLoading}>
                            <Send className="h-4 w-4 mr-2" />
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
                      </CardContent>
                    </Card>
                  )}

                  {/* Quick Tools - siempre visible */}
                  <QuickToolsGrid 
                    onViewChange={(view) => setCurrentView(view as ViewType)} 
                    newLeadsCount={newLeadsCount} 
                  />

                  {/* Professional Development */}
                  <Card 
                    className="cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20"
                    onClick={() => setCurrentView('training')}
                  >
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center">
                          <Brain className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">Formación IA</h3>
                          <p className="text-sm text-muted-foreground">Certifícate en herramientas de IA legal</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Administration Section - open by default */}
                  {(user?.canCreateAgents || user?.canCreateBlogs) && (
                    <details className="group" open>
                      <summary className="flex items-center gap-2 cursor-pointer list-none hover:text-primary">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-lg font-semibold">Administración</h2>
                        <span className="ml-auto text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {user?.canCreateAgents && (
                          <>
                            <Card className="cursor-pointer hover:shadow-md" onClick={() => setCurrentView('agent-creator')}>
                              <CardContent className="p-4 text-center">
                                <Bot className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                                <h4 className="font-medium">Crear Agente</h4>
                              </CardContent>
                            </Card>
                            <Card className="cursor-pointer hover:shadow-md" onClick={() => setCurrentView('agent-manager')}>
                              <CardContent className="p-4 text-center">
                                <Settings className="h-8 w-8 mx-auto mb-2 text-indigo-500" />
                                <h4 className="font-medium">Gestionar Agentes</h4>
                              </CardContent>
                            </Card>
                          </>
                        )}
                        {user?.canCreateBlogs && (
                          <Card className="cursor-pointer hover:shadow-md" onClick={() => setCurrentView('blog-manager')}>
                            <CardContent className="p-4 text-center">
                              <BookOpen className="h-8 w-8 mx-auto mb-2 text-green-500" />
                              <h4 className="font-medium">Gestión Blog</h4>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
        
        {currentView === 'dashboard' && (
          <LawyerOnboardingCoachmarks 
            isVisible={shouldShowOnboarding && !onboardingLoading}
            onComplete={() => user?.id && markOnboardingCompleted(user.id)}
            onSkip={() => user?.id && skipOnboarding(user.id)}
          />
        )}
        
        <LawyerChangeEmailDialog 
          open={showChangeEmailDialog}
          onOpenChange={setShowChangeEmailDialog}
        />
        
        <QuickActionsBar 
          onNavigate={(view) => setCurrentView(view as ViewType)}
          onLogout={logout}
        />
      </SidebarProvider>
    </>
  );
}
