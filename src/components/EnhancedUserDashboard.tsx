import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserTracking } from '@/hooks/useUserTracking';
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
  Shield,
  TrendingUp,
  Zap,
  Star,
  Settings,
  Eye,
  Bell,
  Lock,
  Award,
  BarChart3,
  Target,
  Sparkles,
  ChevronRight,
  Activity
} from 'lucide-react';
import { Input } from './ui/input';
import { useDocumentPayment } from './document-payment/useDocumentPayment';
import DocumentChatFlow from './DocumentChatFlow';
import DocumentCreationSuccess from './DocumentCreationSuccess';
import UserDocumentSelector from './UserDocumentSelector';
import LegalConsultationChat from './LegalConsultationChat';

interface EnhancedUserDashboardProps {
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
}

interface SmartInsight {
  id: string;
  type: 'recommendation' | 'insight' | 'achievement';
  title: string;
  description: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
  icon: any;
}

export default function EnhancedUserDashboard({ onBack, onOpenChat }: EnhancedUserDashboardProps) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<DocumentToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [smartInsights, setSmartInsights] = useState<SmartInsight[]>([]);
  const [userPreferences, setUserPreferences] = useState<any>({
    theme: 'light',
    notifications: true,
    layout: 'cards'
  });
  
  // Document creation states
  const [currentView, setCurrentView] = useState<'dashboard' | 'create-document' | 'document-form' | 'document-success'>('dashboard');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [newDocumentToken, setNewDocumentToken] = useState<string | null>(null);
  const [showConsultation, setShowConsultation] = useState(false);

  const { handleVerifyTrackingCode } = useDocumentPayment();
  const { trackAnonymousUser, trackPageVisit, trackUserAction } = useUserTracking();

  useEffect(() => {
    loadUserData();
    setupAuthListener();
    generateSmartInsights();
    trackPageVisit('user_dashboard');
    trackAnonymousUser();
  }, []);

  useEffect(() => {
    if (documents.length > 0) {
      generateSmartInsights();
    }
  }, [documents]);

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

  const generateSmartInsights = () => {
    const insights: SmartInsight[] = [];

    // Welcome insight
    insights.push({
      id: 'welcome',
      type: 'achievement',
      title: '¡Bienvenido a tu panel personalizado!',
      description: 'Tu espacio seguro para gestionar todos tus documentos legales con confianza.',
      priority: 'high',
      icon: Sparkles
    });

    // Document insights based on history
    if (documents.length === 0) {
      insights.push({
        id: 'first_document',
        type: 'recommendation',
        title: 'Crear tu primer documento',
        description: 'Comienza con nuestros documentos más populares: contratos de arrendamiento o contratos laborales.',
        action: 'Explorar documentos',
        priority: 'high',
        icon: Target
      });
    } else {
      const completedDocs = documents.filter(d => d.status === 'descargado').length;
      if (completedDocs >= 3) {
        insights.push({
          id: 'power_user',
          type: 'achievement',
          title: '¡Usuario Experto!',
          description: `Has completado ${completedDocs} documentos. Tu confianza en nuestros servicios es invaluable.`,
          priority: 'medium',
          icon: Award
        });
      }

      // Pending documents reminder
      const pendingDocs = documents.filter(d => ['solicitado', 'en_revision_abogado'].includes(d.status)).length;
      if (pendingDocs > 0) {
        insights.push({
          id: 'pending_docs',
          type: 'insight',
          title: `${pendingDocs} documento${pendingDocs > 1 ? 's' : ''} en proceso`,
          description: 'Nuestros abogados están revisando tus documentos. Te notificaremos cuando estén listos.',
          priority: 'medium',
          icon: Activity
        });
      }
    }

    // Security insight
    insights.push({
      id: 'security',
      type: 'insight',
      title: 'Tu información está protegida',
      description: 'Utilizamos encriptación de nivel bancario y cumplimos con las normativas de protección de datos.',
      priority: 'low',
      icon: Shield
    });

    setSmartInsights(insights);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = profile?.full_name?.split(' ')[0] || 'Usuario';
    
    if (hour < 12) return `Buenos días, ${name}`;
    if (hour < 18) return `Buenas tardes, ${name}`;
    return `Buenas noches, ${name}`;
  };

  const handleLogout = async () => {
    try {
      trackUserAction('logout');
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
      trackUserAction('download_document', { token });
      await handleVerifyTrackingCode(token);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Error al descargar el documento');
    }
  };

  const handleNewDocumentRequest = () => {
    trackUserAction('create_document_click');
    setCurrentView('create-document');
  };

  const handleAgentSelected = (agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentView('document-form');
  };

  const handleDocumentCreated = (token: string) => {
    setNewDocumentToken(token);
    setCurrentView('document-success');
    loadUserData();
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
    const statusConfig: Record<string, { label: string, variant: any, icon: any, color: string }> = {
      'solicitado': { label: 'Solicitado', variant: 'secondary', icon: Clock, color: 'text-secondary' },
      'en_revision_abogado': { label: 'En Revisión', variant: 'default', icon: AlertCircle, color: 'text-primary' },
      'revision_usuario': { label: 'Para Revisar', variant: 'destructive', icon: AlertCircle, color: 'text-destructive' },
      'pagado': { label: 'Pagado', variant: 'default', icon: CreditCard, color: 'text-success' },
      'descargado': { label: 'Completado', variant: 'default', icon: CheckCircle, color: 'text-success' }
    };

    const config = statusConfig[status] || statusConfig['solicitado'];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 transition-smooth hover-subtle">
        <Icon className={`w-3 h-3 ${config.color}`} />
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
    paid: documents.filter(d => ['pagado', 'descargado'].includes(d.status)).length,
    totalValue: documents.reduce((sum, doc) => sum + doc.price, 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="text-center animate-scale-in">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-secondary animate-spin mx-auto" style={{ animationDelay: '-0.5s', animationDuration: '1.5s' }}></div>
          </div>
          <h3 className="text-lg font-semibold text-primary mb-2">Preparando tu dashboard</h3>
          <p className="text-muted-foreground">Cargando tu información personalizada...</p>
        </div>
      </div>
    );
  }

  // Handle different views
  if (currentView === 'create-document') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="border-b bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleBackFromDocumentCreation} className="hover-lift">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al Dashboard
                </Button>
                <div>
                  <h1 className="text-xl font-semibold">Crear Nuevo Documento</h1>
                  <p className="text-sm text-muted-foreground">Selecciona el tipo de documento que necesitas</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="hover-lift">
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
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="border-b bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleBackFromForm} className="hover-lift">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver a Selección
                </Button>
                <div>
                  <h1 className="text-xl font-semibold">Completar Información</h1>
                  <p className="text-sm text-muted-foreground">Llena los datos necesarios para tu documento</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="hover-lift">
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
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="border-b bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-xl font-semibold">Documento Creado Exitosamente</h1>
                  <p className="text-sm text-muted-foreground">Tu documento ha sido generado y está listo</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="hover-lift">
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
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => setShowConsultation(false)} className="hover-lift">
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Enhanced Header with Security Indicators */}
      <div className="bg-card/80 backdrop-blur-sm border-b shadow-soft sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button variant="ghost" size="sm" onClick={onBack} className="hover-lift">
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-lg animate-pulse-subtle">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-card flex items-center justify-center">
                    <Shield className="w-2 h-2 text-white" />
                  </div>
                </div>
                
                <div>
                  <div className="inline-flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium mb-1 hover-subtle transition-smooth">
                    <User className="w-3 h-3 mr-1" />
                    Panel Personal Verificado
                    <Shield className="w-3 h-3 ml-1" />
                  </div>
                  <h1 className="text-xl font-bold">{getGreeting()}</h1>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Lock className="w-3 h-3" />
                    Sesión segura • Datos protegidos
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="hover-lift">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="hover-lift">
                <Settings className="w-4 h-4" />
              </Button>
              <Button onClick={handleLogout} variant="outline" className="hover-lift">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Smart Insights Section */}
        <div className="mb-8 animate-slide-up">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary" />
            Insights Personalizados
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {smartInsights.map((insight) => (
              <Card key={insight.id} className="hover-lift transition-smooth cursor-pointer shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      insight.type === 'recommendation' ? 'bg-secondary/10' :
                      insight.type === 'achievement' ? 'bg-success/10' : 'bg-primary/10'
                    }`}>
                      <insight.icon className={`w-4 h-4 ${
                        insight.type === 'recommendation' ? 'text-secondary' :
                        insight.type === 'achievement' ? 'text-success' : 'text-primary'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm mb-1">{insight.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{insight.description}</p>
                      {insight.action && (
                        <Button size="sm" variant="ghost" className="text-xs p-0 h-auto font-medium">
                          {insight.action} <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-slide-up">
          <Card className="hover-lift transition-smooth shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Documentos</p>
                  <p className="text-3xl font-bold text-primary">{stats.total}</p>
                  <p className="text-xs text-success flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    Creciendo
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-xl">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift transition-smooth shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En Proceso</p>
                  <p className="text-3xl font-bold text-secondary">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground mt-1">Bajo revisión</p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-xl">
                  <Clock className="w-8 h-8 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift transition-smooth shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completados</p>
                  <p className="text-3xl font-bold text-success">{stats.completed}</p>
                  <p className="text-xs text-success flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3" />
                    Finalizados
                  </p>
                </div>
                <div className="bg-success/10 p-3 rounded-xl">
                  <Award className="w-8 h-8 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift transition-smooth shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold text-primary">{formatPrice(stats.totalValue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Inversión total</p>
                </div>
                <div className="bg-success/10 p-3 rounded-xl">
                  <DollarSign className="w-8 h-8 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-slide-up">
          <Card className="cursor-pointer hover-lift transition-smooth shadow-card group" onClick={handleNewDocumentRequest}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-primary to-primary-light p-4 rounded-xl group-hover:scale-110 transition-bounce">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Nuevo Documento</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Crear un nuevo documento legal personalizado
                  </p>
                  <div className="flex items-center text-xs text-primary font-medium">
                    <Zap className="w-3 h-3 mr-1" />
                    Proceso rápido y seguro
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-smooth" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover-lift transition-smooth shadow-card group" onClick={() => setShowConsultation(true)}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-secondary to-secondary p-4 rounded-xl group-hover:scale-110 transition-bounce">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Consulta Jurídica</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Asesoría legal inteligente disponible 24/7
                  </p>
                  <div className="flex items-center text-xs text-secondary font-medium">
                    <Star className="w-3 h-3 mr-1" />
                    IA especializada en derecho
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-secondary transition-smooth" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-slide-up">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="transition-smooth">Vista General</TabsTrigger>
            <TabsTrigger value="documents" className="transition-smooth">Mis Documentos</TabsTrigger>
            <TabsTrigger value="profile" className="transition-smooth">Mi Perfil</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Recent Activity */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Actividad Reciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.slice(0, 3).map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 py-3 border-b last:border-b-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{doc.document_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString('es-CO')} • {formatPrice(doc.price)}
                      </p>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                ))}
                {documents.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay actividad reciente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            {/* Enhanced Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 transition-smooth hover-subtle"
                />
              </div>
            </div>

            {/* Enhanced Documents List */}
            <div className="space-y-4">
              {filteredDocuments.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="p-12 text-center animate-scale-in">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FileText className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">No tienes documentos aún</h3>
                    <p className="text-muted-foreground mb-6">
                      Comienza creando tu primer documento legal con nuestro sistema inteligente
                    </p>
                    <Button onClick={handleNewDocumentRequest} className="hover-lift">
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Primer Documento
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredDocuments.map((doc, index) => (
                  <Card key={doc.id} className="hover-lift transition-smooth shadow-card animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-light rounded-xl flex items-center justify-center">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{doc.document_type}</h3>
                              {getStatusBadge(doc.status)}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-primary" />
                              <span>Creado: {new Date(doc.created_at).toLocaleDateString('es-CO')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-success" />
                              <span className="font-medium">{formatPrice(doc.price)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-secondary" />
                              <span className="font-mono text-xs">{doc.token}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {doc.status === 'pagado' || doc.status === 'descargado' ? (
                            <Button
                              size="sm"
                              onClick={() => handleDownloadDocument(doc.token)}
                              className="hover-lift"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Descargar
                            </Button>
                          ) : doc.status === 'revision_usuario' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadDocument(doc.token)}
                              className="hover-lift"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Revisar y Pagar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadDocument(doc.token)}
                              className="hover-lift"
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Information */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Mi Información
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Nombre completo</label>
                      <p className="font-semibold mt-1">{profile?.full_name || 'No especificado'}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Correo electrónico</label>
                      <p className="font-semibold mt-1">{profile?.email || user?.email}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Teléfono</label>
                      <p className="font-semibold mt-1">{profile?.phone || 'No especificado'}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Miembro desde</label>
                      <p className="font-semibold mt-1">
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-CO') : 'No disponible'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security & Privacy */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-success" />
                    Seguridad y Privacidad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-success" />
                        <span className="text-sm">Encriptación Activa</span>
                      </div>
                      <Badge variant="default" className="bg-success text-white">Activo</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-success" />
                        <span className="text-sm">Autenticación Segura</span>
                      </div>
                      <Badge variant="default" className="bg-success text-white">Verificado</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary" />
                        <span className="text-sm">Datos Personales</span>
                      </div>
                      <Badge variant="outline">Protegido</Badge>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Tu información está protegida con encriptación de nivel bancario. 
                      Cumplimos con todas las normativas de protección de datos.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}