import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  User,
  FileText,
  MessageCircle,
  Download,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  LogOut,
  Plus,
  Search,
  Calendar,
  DollarSign,
  ArrowLeft,
  ArrowRight,
  Users
} from 'lucide-react';
import { Input } from './ui/input';
import { useDocumentPayment } from './document-payment/useDocumentPayment';
import DocumentChatFlow from './DocumentChatFlow';
import DocumentCreationSuccess from './DocumentCreationSuccess';
import UserDocumentSelector from './UserDocumentSelector';
import LegalConsultationChat from './LegalConsultationChat';
import { useFreeDocuments } from '@/hooks/useFreeDocuments';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface UserDashboardPageProps {
  onBack: () => void;
  onOpenChat: (message?: string) => void;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  created_at: string;
}

interface DocumentToken {
  id: string;
  token: string;
  document_type: string;
  document_content: string;
  user_name: string;
  user_email: string;
  price: number;
  status: 'solicitado' | 'en_revision_abogado' | 'revision_usuario' | 'pagado' | 'descargado';
  sla_deadline: string;
  created_at: string;
  updated_at: string;
  lawyer_comments?: string;
  lawyer_comments_date?: string;
}

export default function UserDashboardPage({ onBack, onOpenChat }: UserDashboardPageProps) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<DocumentToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('documents');
  
  // Document creation states - integrated workflow
  const [currentView, setCurrentView] = useState<'dashboard' | 'create-document' | 'document-form' | 'document-success'>('dashboard');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [newDocumentToken, setNewDocumentToken] = useState<string | null>(null);
  
  // Consultation states
  const [showConsultation, setShowConsultation] = useState(false);

  const { handleVerifyTrackingCode } = useDocumentPayment();
  const { documents: freeDocuments, loading: loadingFreeDocuments } = useFreeDocuments();

  const iconMap: { [key: string]: any } = {
    FileText: FileText,
    Users: Users,
    CreditCard: CreditCard,
    Clock: Clock,
    CheckCircle: CheckCircle,
    AlertCircle: AlertCircle,
  };

  useEffect(() => {
    loadUserData();
    setupAuthListener();
  }, []);

  const setupAuthListener = () => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        onBack();
      }
    });

    return () => subscription.unsubscribe();
  };

  const loadUserData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        onBack();
        return;
      }

      setUser(user);

      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError);
      } else if (profileData) {
        setProfile(profileData);
      }

      // Load user documents
      await loadUserDocuments(user.id);
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Error al cargar los datos del usuario');
    } finally {
      setLoading(false);
    }
  };

  const loadUserDocuments = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_tokens')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading documents:', error);
        return;
      }

      setDocuments((data || []) as DocumentToken[]);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('Sesión cerrada exitosamente');
      onBack();
    } catch (error: any) {
      toast.error('Error al cerrar sesión: ' + error.message);
    }
  };

  const handleDownloadDocument = async (token: string) => {
    try {
      await handleVerifyTrackingCode(token);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Error al descargar el documento');
    }
  };

  const handleNewDocumentRequest = () => {
    setCurrentView('create-document');
  };

  const handleAgentSelected = (agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentView('document-form');
  };

  const handleDocumentCreated = (token: string) => {
    setNewDocumentToken(token);
    setCurrentView('document-success');
    loadUserData(); // Reload to show new document
  };

  const handleBackFromForm = () => {
    setCurrentView('create-document');
  };

  const handleBackFromDocumentCreation = () => {
    setCurrentView('dashboard');
    setSelectedAgentId(null);
  };

  const handleBackFromSuccess = () => {
    setCurrentView('dashboard');
    setNewDocumentToken(null);
    setSelectedAgentId(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string, variant: any, icon: any }> = {
      'solicitado': { label: 'Solicitado', variant: 'secondary', icon: Clock },
      'en_revision_abogado': { label: 'En Revisión', variant: 'default', icon: AlertCircle },
      'revision_usuario': { label: 'Para Revisar', variant: 'destructive', icon: AlertCircle },
      'pagado': { label: 'Pagado', variant: 'default', icon: CreditCard },
      'descargado': { label: 'Completado', variant: 'default', icon: CheckCircle }
    };

    const config = statusConfig[status] || statusConfig['solicitado'];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredDocuments = documents.filter(doc =>
    doc.document_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.token.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: documents.length,
    pending: documents.filter(d => ['solicitado', 'en_revision_abogado'].includes(d.status)).length,
    completed: documents.filter(d => d.status === 'descargado').length,
    paid: documents.filter(d => ['pagado', 'descargado'].includes(d.status)).length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Render different views based on current state
  if (currentView === 'create-document') {
    return (
      <div className="min-h-screen bg-background">
        {/* Mantener header dentro de la experiencia */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleBackFromDocumentCreation}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al Dashboard
                </Button>
                <div>
                  <h1 className="text-xl font-semibold">Crear Nuevo Documento</h1>
                  <p className="text-sm text-muted-foreground">Selecciona el tipo de documento que necesitas</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
        
        <UserDocumentSelector
          onAgentSelected={handleAgentSelected}
          onOpenChat={onOpenChat}
        />
      </div>
    );
  }

  if (currentView === 'document-form' && selectedAgentId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleBackFromForm}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver a Selección
                </Button>
                <div>
                  <h1 className="text-xl font-semibold">Completar Información</h1>
                  <p className="text-sm text-muted-foreground">Llena los datos necesarios para tu documento</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
        
        <DocumentChatFlow
          agentId={selectedAgentId}
          onBack={handleBackFromForm}
          onComplete={handleDocumentCreated}
        />
      </div>
    );
  }

  if (currentView === 'document-success' && newDocumentToken) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-xl font-semibold">Documento Creado Exitosamente</h1>
                  <p className="text-sm text-muted-foreground">Tu documento ha sido generado y está listo</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
        
        <DocumentCreationSuccess
          token={newDocumentToken}
          onBack={handleBackFromSuccess}
          onNavigateToTracking={() => {
            handleBackFromSuccess();
            setActiveTab('documents');
          }}
        />
      </div>
    );
  }

  if (showConsultation) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => setShowConsultation(false)}>
              ← Volver al Dashboard
            </Button>
            <h1 className="text-2xl font-bold">Consulta Jurídica</h1>
          </div>
          <LegalConsultationChat />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
              <div>
                <div className="inline-flex items-center bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium mb-1">
                  <User className="w-3 h-3 mr-1" />
                  Panel Personal
                </div>
                <h1 className="text-xl font-bold">Mi Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Hola, {profile?.full_name || user?.email}
                </p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Documentos</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En Proceso</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pagados</p>
                  <p className="text-2xl font-bold">{stats.paid}</p>
                </div>
                <CreditCard className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completados</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleNewDocumentRequest}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Nuevo Documento</h3>
                  <p className="text-sm text-muted-foreground">
                    Crear un nuevo documento legal
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowConsultation(true)}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-success/10 p-3 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold">Consulta Jurídica</h3>
                  <p className="text-sm text-muted-foreground">
                    Hacer una consulta legal con IA
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Free Documents Section */}
        {!loadingFreeDocuments && freeDocuments.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Documentos Gratuitos</h2>
                <p className="text-muted-foreground">Genera estos documentos sin costo alguno</p>
              </div>
            </div>
            
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              plugins={[
                Autoplay({
                  delay: 4000,
                  stopOnInteraction: true,
                }),
              ]}
              className="w-full"
            >
              <CarouselContent>
                {freeDocuments.map((doc) => {
                  const IconComponent = iconMap[doc.frontend_icon || 'FileText'] || FileText;
                  return (
                    <CarouselItem key={doc.id} className="md:basis-1/2 lg:basis-1/3">
                      <Card className="h-[340px] flex flex-col hover:shadow-lg transition-shadow">
                        <CardContent className="p-6 flex flex-col flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div className="bg-success/10 p-3 rounded-lg">
                              <IconComponent className="w-8 h-8 text-success" />
                            </div>
                            <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                              Gratis
                            </Badge>
                          </div>
                          
                          <h3 className="font-bold text-lg mb-2 line-clamp-2">
                            {doc.document_name}
                          </h3>
                          
                          <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3">
                            {doc.document_description}
                          </p>
                          
                          <div className="mt-auto pt-4 border-t">
                            <Button 
                              className="w-full"
                              variant="success"
                              onClick={() => handleAgentSelected(doc.id)}
                            >
                              {doc.button_cta || 'Generar'}
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="documents">Mis Documentos</TabsTrigger>
            <TabsTrigger value="profile">Mi Perfil</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-6">
            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Documents List */}
            <div className="space-y-4">
              {filteredDocuments.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No tienes documentos aún</h3>
                    <p className="text-muted-foreground mb-4">
                      Comienza creando tu primer documento legal
                    </p>
                    <Button onClick={handleNewDocumentRequest}>
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Documento
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredDocuments.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{doc.document_type}</h3>
                            {getStatusBadge(doc.status)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {new Date(doc.created_at).toLocaleDateString('es-CO')}
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              {formatPrice(doc.price)}
                            </div>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              {doc.token}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {doc.status === 'pagado' || doc.status === 'descargado' ? (
                            <Button
                              size="sm"
                              onClick={() => handleDownloadDocument(doc.token)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Descargar
                            </Button>
                          ) : doc.status === 'revision_usuario' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadDocument(doc.token)}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Revisar y Pagar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadDocument(doc.token)}
                            >
                              <Search className="w-4 h-4 mr-2" />
                              Ver Estado
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Mi Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Nombre completo</label>
                    <p className="text-muted-foreground">{profile?.full_name || 'No especificado'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Correo electrónico</label>
                    <p className="text-muted-foreground">{profile?.email || user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Teléfono</label>
                    <p className="text-muted-foreground">{profile?.phone || 'No especificado'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Miembro desde</label>
                    <p className="text-muted-foreground">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-CO') : 'No disponible'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}