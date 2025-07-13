import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLawyerAuth } from "@/hooks/useLawyerAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, User, Calendar, DollarSign, Save, CheckCircle, Bot, Plus, Settings, LogOut, Scale, Users, TrendingUp, BarChart3 } from "lucide-react";
import LawyerStatsSection from "./LawyerStatsSection";
import LawyerLogin from "./LawyerLogin";
import AgentCreatorPage from "./AgentCreatorPage";
import AgentManagerPage from "./AgentManagerPage";

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
  agent_sla_hours?: number;
}

interface LawyerDashboardPageProps {
  onOpenChat: (message: string) => void;
}

export default function LawyerDashboardPage({ onOpenChat }: LawyerDashboardPageProps) {
  const [documents, setDocuments] = useState<DocumentToken[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentToken | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'stats' | 'agent-creator' | 'agent-manager'>('dashboard');
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user, logout } = useLawyerAuth();
  const isMobile = useIsMobile();

  // Fetch documents when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchPendingDocuments();
    }
  }, [isAuthenticated]);

  const fetchPendingDocuments = async () => {
    setIsLoading(true);
    try {
      if (!user) {
        console.error('No user data available');
        return;
      }

      // Get the lawyer token from storage
      const authData = sessionStorage.getItem('lawyer_token');
      if (!authData) {
        console.error('No lawyer token found');
        toast({
          title: "Error de autenticación",
          description: "Token de abogado no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive",
        });
        return;
      }

      // Use the new edge function to get filtered documents
      const { data, error } = await supabase.functions.invoke('get-lawyer-documents', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData}`
        }
      });

      if (error) {
        console.error('Error fetching documents:', error);
        toast({
          title: "Error al cargar documentos",
          description: "No se pudieron cargar los documentos pendientes.",
          variant: "destructive",
        });
        return;
      }

      setDocuments(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error al cargar documentos",
        description: "Ocurrió un error inesperado al cargar los documentos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDocument = (document: DocumentToken) => {
    setSelectedDocument(document);
    setEditedContent(document.document_content);
  };

  const handleSaveDocument = async () => {
    if (!selectedDocument) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('document_tokens')
        .update({ 
          document_content: editedContent,
          status: 'en_revision_abogado',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDocument.id);

      if (error) {
        console.error('Error updating document:', error);
        toast({
          title: "Error al guardar",
          description: "No se pudo guardar el documento.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Documento guardado",
        description: "Los cambios han sido guardados exitosamente.",
      });

      // Update local state
      setSelectedDocument({ ...selectedDocument, document_content: editedContent });
      await fetchPendingDocuments();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveDocument = async () => {
    if (!selectedDocument) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('document_tokens')
        .update({ 
          document_content: editedContent,
          status: 'revision_usuario',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDocument.id);

      if (error) {
        console.error('Error approving document:', error);
        toast({
          title: "Error al aprobar",
          description: "No se pudo aprobar el documento.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Documento aprobado",
        description: "El documento ha sido revisado y aprobado.",
      });

      setSelectedDocument(null);
      setEditedContent("");
      await fetchPendingDocuments();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'solicitado':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Solicitado</Badge>;
      case 'en_revision_abogado':
        return <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">En Revisión</Badge>;
      case 'revisado':
        return <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">Revisado</Badge>;
      case 'revision_usuario':
        return <Badge variant="default" className="bg-purple-50 text-purple-700 border-purple-200">Revisión Usuario</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSLABadge = (document: DocumentToken) => {
    if (!document.sla_hours) {
      return null;
    }

    const slaDeadline = new Date(document.created_at);
    slaDeadline.setHours(slaDeadline.getHours() + document.sla_hours);
    const now = new Date();
    const timeLeft = slaDeadline.getTime() - now.getTime();
    const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));

    if (timeLeft <= 0) {
      return <Badge variant="destructive" className="ml-2">ANS Vencido</Badge>;
    } else if (hoursLeft <= 2) {
      return <Badge variant="outline" className="ml-2 bg-orange-50 text-orange-700 border-orange-200">
        ANS: {hoursLeft}h restantes
      </Badge>;
    } else {
      return <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
        ANS: {hoursLeft}h restantes
      </Badge>;
    }
  };

  const getSLAProgress = (document: DocumentToken) => {
    if (!document.sla_hours) {
      return null;
    }

    const created = new Date(document.created_at);
    const slaDeadline = new Date(created);
    slaDeadline.setHours(slaDeadline.getHours() + document.sla_hours);
    const now = new Date();
    
    const totalTime = slaDeadline.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();
    const progress = Math.min(100, (elapsed / totalTime) * 100);
    
    let progressClass = "bg-green-500";
    if (progress > 80) {
      progressClass = "bg-red-500";
    } else if (progress > 60) {
      progressClass = "bg-orange-500";
    }

    return (
      <div className="mt-2">
        <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
          <span>Progreso ANS</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${progressClass}`}
            style={{ width: `${Math.min(100, progress)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LawyerLogin onLoginSuccess={() => {}} />;
  }

  // Show loading if auth is still loading or documents are loading
  if (authLoading || isLoading) {
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

  // Show Agent Creator if selected
  if (currentView === 'agent-creator') {
    return <AgentCreatorPage onBack={() => setCurrentView('dashboard')} lawyerData={user} />;
  }

  // Show Agent Manager if selected
  if (currentView === 'agent-manager') {
    return <AgentManagerPage onBack={() => setCurrentView('dashboard')} lawyerData={user} />;
  }

  // Show Stats if selected
  if (currentView === 'stats') {
    return (
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <Button
              onClick={() => setCurrentView('dashboard')}
              variant="outline"
              className="flex items-center gap-2"
            >
              ← Volver al Dashboard
            </Button>
            <Button
              onClick={logout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
          <LawyerStatsSection />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className={`${isMobile ? 'space-y-4' : 'flex justify-between items-start'}`}>
            <div>
              <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-primary mb-2`}>
                Panel de Abogados
              </h1>
              <p className={`${isMobile ? 'text-base' : 'text-lg'} text-muted-foreground`}>
                Revisa y ajusta los documentos pendientes
              </p>
            </div>
            
            <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex items-center gap-3'}`}>
              {/* Stats Button */}
              <Button
                onClick={() => setCurrentView('stats')}
                variant="outline"
                className="flex items-center gap-2 justify-center"
                size={isMobile ? "default" : "lg"}
              >
                <BarChart3 className="h-4 w-4" />
                {!isMobile && "Estadísticas"}
              </Button>

              {/* Agent Creator Access - Only show if lawyer has permission */}
              {user?.canCreateAgents && (
                <>
                  <Button
                    onClick={() => setCurrentView('agent-manager')}
                    variant="outline"
                    className="flex items-center gap-2 justify-center"
                    size={isMobile ? "default" : "lg"}
                  >
                    <Settings className="h-5 w-5" />
                    {isMobile ? "Gestionar Agentes" : "Gestionar Agentes"}
                  </Button>
                  <Button
                    onClick={() => setCurrentView('agent-creator')}
                    className="flex items-center gap-2 justify-center"
                    size={isMobile ? "default" : "lg"}
                  >
                    <Bot className="h-5 w-5" />
                    <Plus className="h-4 w-4" />
                    {isMobile ? "Crear Agentes" : "Crear Agente"}
                  </Button>
                </>
              )}
              
              {/* Logout Button */}
              <Button
                onClick={logout}
                variant="outline"
                className="flex items-center gap-2 justify-center"
                size={isMobile ? "default" : "lg"}
              >
                <LogOut className="h-5 w-5" />
                {isMobile ? "Salir" : "Cerrar Sesión"}
              </Button>
            </div>
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
              documents.map((document) => (
                <Card 
                  key={document.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedDocument?.id === document.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleSelectDocument(document)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{document.document_type}</CardTitle>
                      <div className="flex items-center">
                        {getStatusBadge(document.status)}
                        {getSLABadge(document)}
                      </div>
                    </div>
                    <CardDescription>
                      Código: {document.token}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {document.user_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{document.user_name}</span>
                        </div>
                      )}
                      {document.user_email && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{document.user_email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(document.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>${document.price.toLocaleString()}</span>
                      </div>
                      
                      {/* Show user observations if any */}
                      {document.user_observations && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-yellow-600" />
                            <span className="font-medium text-yellow-800 dark:text-yellow-200">Observaciones del Cliente:</span>
                          </div>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">{document.user_observations}</p>
                          {document.user_observation_date && (
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                              Enviadas: {new Date(document.user_observation_date).toLocaleDateString('es-CO')} {new Date(document.user_observation_date).toLocaleTimeString('es-CO')}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* ANS Progress */}
                      {getSLAProgress(document)}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Document Editor */}
          <div className="space-y-4">
            {selectedDocument ? (
              <>
                <div className={`${isMobile ? 'space-y-4' : 'flex items-center justify-between'}`}>
                  <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold`}>Editor de Documento</h2>
                  <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex gap-2'}`}>
                    <Button 
                      onClick={handleSaveDocument}
                      disabled={isSaving}
                      variant="outline"
                      className={isMobile ? "w-full" : ""}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                    <Button 
                      onClick={handleApproveDocument}
                      disabled={isSaving}
                      className={isMobile ? "w-full" : ""}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprobar
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>{selectedDocument.document_type}</CardTitle>
                    <CardDescription>
                      Código: {selectedDocument.token} | Estado: {getStatusBadge(selectedDocument.status)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      placeholder="Contenido del documento..."
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Selecciona un documento de la lista para comenzar a editarlo
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}