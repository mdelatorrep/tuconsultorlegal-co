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
  Activity,
  Mail,
  MoreVertical,
  Trash2,
  Info
} from 'lucide-react';
import { Input } from './ui/input';
import { useDocumentPayment } from './document-payment/useDocumentPayment';
import DocumentChatFlow from './DocumentChatFlow';
import DocumentCreationSuccess from './DocumentCreationSuccess';
import UserDocumentSelector from './UserDocumentSelector';
import LegalConsultationChat from './LegalConsultationChat';
import { useUserOnboarding } from '@/hooks/useUserOnboarding';
import { UserOnboardingCoachmarks } from './UserOnboardingCoachmarks';
import ChatWidget from './ChatWidget';
import { IntelligentDocumentSearch } from './IntelligentDocumentSearch';
import { ChangeEmailDialog } from './ChangeEmailDialog';
import { PasswordResetDialog } from './PasswordResetDialog';
import { MagicLinkDialog } from './MagicLinkDialog';
import { DocumentDetailsDialog } from './DocumentDetailsDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentToken | null>(null);
  const [showDocumentDetails, setShowDocumentDetails] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const { handleVerifyTrackingCode } = useDocumentPayment();
  const { trackAnonymousUser, trackPageVisit, trackUserAction } = useUserTracking();
  
  // Onboarding state
  const { completed: onboardingCompleted, loading: onboardingLoading, markAsCompleted, skipOnboarding } = useUserOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    loadUserData();
    setupAuthListener();
    generateSmartInsights();
    trackPageVisit('user_dashboard');
    trackAnonymousUser();
  }, []);

  // Check onboarding status when component loads
  useEffect(() => {
    if (!onboardingLoading && !onboardingCompleted && user) {
      // Delay to ensure dashboard is fully rendered
      setTimeout(() => {
        setShowOnboarding(true);
      }, 500);
    }
  }, [onboardingLoading, onboardingCompleted, user]);

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
        toast.error('Sesión expirada, por favor inicia sesión nuevamente');
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

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it automatically
          console.log('Profile not found, creating new profile for user:', user.id);
          
          const newProfile = {
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
            email: user.email || '',
            phone: user.user_metadata?.phone || null
          };
          
          const { data: createdProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert([newProfile])
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating profile:', createError);
            toast.error('Error al crear perfil de usuario');
            // Use auth data as fallback
            setProfile({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
              email: user.email || '',
              created_at: user.created_at
            });
          } else {
            setProfile(createdProfile);
            toast.success('Perfil creado exitosamente');
          }
        } else {
          console.error('Error loading profile:', profileError);
          toast.error('Error al cargar perfil de usuario');
          // Use auth data as fallback
          setProfile({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
            email: user.email || '',
            created_at: user.created_at
          });
        }
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
      // Get user email for fallback query
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting user:', userError);
        return;
      }

      // Query documents by user_id OR by user_email (for legacy documents)
      const { data, error } = await supabase
        .from('document_tokens')
        .select('*')
        .or(`user_id.eq.${userId},user_email.eq.${user.email}`)
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
      title: '¡Bienvenido!',
      description: 'Este es tu espacio para gestionar tus documentos legales de forma fácil y segura.',
      priority: 'high',
      icon: Sparkles
    });

    // Document insights based on history
    if (documents.length === 0) {
      insights.push({
        id: 'first_document',
        type: 'recommendation',
        title: 'Crea tu primer documento',
        description: 'Empieza con un contrato de arrendamiento o un contrato laboral.',
        action: 'Ver documentos',
        priority: 'high',
        icon: Target
      });
    } else {
      const completedDocs = documents.filter(d => d.status === 'descargado').length;
      if (completedDocs >= 3) {
        insights.push({
          id: 'power_user',
          type: 'achievement',
          title: '¡Felicitaciones!',
          description: `Ya has completado ${completedDocs} documentos con éxito.`,
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
          title: `Tienes ${pendingDocs} documento${pendingDocs > 1 ? 's' : ''} en proceso`,
          description: 'Un abogado está revisando tu documento. Te avisaremos cuando esté listo.',
          priority: 'medium',
          icon: Activity
        });
      }
    }

    // Security insight
    insights.push({
      id: 'security',
      type: 'insight',
      title: 'Tu información está segura',
      description: 'Protegemos tus datos con la mejor tecnología disponible.',
      priority: 'low',
      icon: Shield
    });

    setSmartInsights(insights);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    // Try to get name from profile, fall back to user metadata, then email, then generic
    const name = profile?.full_name?.split(' ')[0] 
      || user?.user_metadata?.full_name?.split(' ')[0] 
      || user?.email?.split('@')[0] 
      || 'Usuario';
    
    if (hour < 12) return `Buenos días, ${name}`;
    if (hour < 18) return `Buenas tardes, ${name}`;
    return `Buenas noches, ${name}`;
  };
  
  const getUserDisplayName = () => {
    return profile?.full_name 
      || user?.user_metadata?.full_name 
      || user?.email?.split('@')[0] 
      || 'Usuario';
  };
  
  const getUserEmail = () => {
    return profile?.email || user?.email || '';
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

  const handleViewDetails = (doc: DocumentToken) => {
    setSelectedDocument(doc);
    setShowDocumentDetails(true);
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      // Delete by ID - RLS policy will handle authorization
      const { error } = await supabase
        .from('document_tokens')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Documento eliminado exitosamente');
      setDocumentToDelete(null);
      
      // Reload documents
      if (user) {
        await loadUserDocuments(user.id);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Error al eliminar el documento');
    }
  };

  const canDeleteDocument = (status: string) => {
    // Only allow deletion for documents not yet paid or completed
    return ['solicitado', 'en_revision_abogado'].includes(status);
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
        
        <div className="container mx-auto px-6 py-8">
          {/* Intelligent Document Search */}
          <div className="mb-8">
            <IntelligentDocumentSearch
              audience="personas"
              onDocumentSelect={handleAgentSelected}
              placeholder="Busca documentos con lenguaje natural... Ej: 'contrato de compraventa'"
            />
          </div>

          <div className="border-t pt-8">
            <h3 className="text-xl font-semibold mb-6">O selecciona por categoría</h3>
            <UserDocumentSelector
              onAgentSelected={handleAgentSelected}
              onOpenChat={onOpenChat}
            />
          </div>
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 pb-20 md:pb-8">
      {/* Mobile-First Header */}
      <div className="bg-card/95 backdrop-blur-sm border-b shadow-soft sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          {/* Mobile Layout */}
          <div className="flex items-center justify-between md:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="font-semibold text-sm">Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Sesión segura
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-card flex items-center justify-center">
                  <Shield className="w-2 h-2 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold">{getGreeting()}</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  Sesión segura • Datos protegidos
                </p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" className="hover-lift">
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* Smart Insights Section - Hidden on small mobile */}
        <div className="mb-6 animate-slide-up hidden sm:block">
          <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-secondary" />
            Información Importante
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {smartInsights.map((insight) => (
              <Card key={insight.id} className="hover-lift transition-smooth cursor-pointer shadow-card">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className={`p-2 rounded-lg ${
                      insight.type === 'recommendation' ? 'bg-secondary/10' :
                      insight.type === 'achievement' ? 'bg-success/10' : 'bg-primary/10'
                    }`}>
                      <insight.icon className={`w-3 h-3 md:w-4 md:h-4 ${
                        insight.type === 'recommendation' ? 'text-secondary' :
                        insight.type === 'achievement' ? 'text-success' : 'text-primary'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-xs md:text-sm mb-1">{insight.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{insight.description}</p>
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

        {/* Enhanced Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8 animate-slide-up">
          <Card className="hover-lift transition-smooth shadow-card">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl md:text-3xl font-bold text-primary">{stats.total}</p>
                  <p className="text-xs text-success flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    Activo
                  </p>
                </div>
                <div className="bg-primary/10 p-2 md:p-3 rounded-xl self-end md:self-auto">
                  <FileText className="w-5 h-5 md:w-8 md:h-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift transition-smooth shadow-card">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">En Proceso</p>
                  <p className="text-2xl md:text-3xl font-bold text-secondary">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground mt-1">En revisión</p>
                </div>
                <div className="bg-secondary/10 p-2 md:p-3 rounded-xl self-end md:self-auto">
                  <Clock className="w-5 h-5 md:w-8 md:h-8 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift transition-smooth shadow-card">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Completos</p>
                  <p className="text-2xl md:text-3xl font-bold text-success">{stats.completed}</p>
                  <p className="text-xs text-success flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3" />
                    Finalizados
                  </p>
                </div>
                <div className="bg-success/10 p-2 md:p-3 rounded-xl self-end md:self-auto">
                  <CheckCircle className="w-5 h-5 md:w-8 md:h-8 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Quick Actions - Floating buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6 md:hidden animate-slide-up">
          <Button 
            onClick={handleNewDocumentRequest}
            className="h-20 flex-col gap-2"
            size="lg"
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm">Crear Documento</span>
          </Button>

          <Button 
            onClick={() => setShowConsultation(true)}
            className="h-20 flex-col gap-2"
            variant="secondary"
            size="lg"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-sm">Hablar con Lexi</span>
          </Button>
        </div>

        {/* Desktop Enhanced Quick Actions */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-slide-up">
          <Card className="cursor-pointer hover-lift transition-smooth shadow-card group" onClick={handleNewDocumentRequest}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-primary to-primary-light p-4 rounded-xl group-hover:scale-110 transition-bounce">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Crear Documento</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Solicita un nuevo documento legal
                  </p>
                  <div className="flex items-center text-xs text-primary font-medium">
                    <Zap className="w-3 h-3 mr-1" />
                    Rápido y fácil
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
                  <h3 className="font-semibold text-lg mb-1">Hablar con Lexi</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Tu asistente legal disponible siempre
                  </p>
                  <div className="flex items-center text-xs text-secondary font-medium">
                    <Star className="w-3 h-3 mr-1" />
                    Respuestas inmediatas
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-secondary transition-smooth" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Main Content Tabs - Mobile Optimized */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-slide-up">
          <TabsList className="grid w-full grid-cols-3 mb-4 md:mb-6">
            <TabsTrigger value="overview" className="transition-smooth text-xs md:text-sm">Inicio</TabsTrigger>
            <TabsTrigger value="documents" className="transition-smooth text-xs md:text-sm">Documentos</TabsTrigger>
            <TabsTrigger value="profile" className="transition-smooth text-xs md:text-sm">Perfil</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Recent Activity */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Últimos Documentos
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
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Aún no has solicitado documentos</p>
                    <p className="text-sm text-muted-foreground mt-2">Empieza creando tu primer documento</p>
                  </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 md:space-y-6">
            {/* Enhanced Search - Mobile Optimized */}
            <div className="flex items-center gap-3 md:gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 transition-smooth hover-subtle"
                />
              </div>
            </div>

            {/* Documents Grid - Mobile Optimized */}
            <div className="space-y-3 md:space-y-4">
              {filteredDocuments.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="p-8 md:p-12 text-center">
                    <FileText className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-base md:text-lg mb-2">No hay documentos</h3>
                    <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
                      {searchTerm ? 'No se encontraron documentos' : 'Crea tu primer documento legal'}
                    </p>
                    <Button onClick={handleNewDocumentRequest} className="w-full md:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Documento
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredDocuments.map((doc) => (
                  <Card key={doc.id} className="shadow-card hover-lift transition-smooth">
                    <CardContent className="p-4 md:p-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm md:text-base mb-1 truncate">{doc.document_type}</h3>
                            <p className="text-xs md:text-sm text-muted-foreground">Token: {doc.token}</p>
                          </div>
                          {getStatusBadge(doc.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
                          <div>
                            <p className="text-muted-foreground mb-1">Creado</p>
                            <p className="font-medium">{new Date(doc.created_at).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Precio</p>
                            <p className="font-medium">{formatPrice(doc.price)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {doc.status === 'revision_usuario' ? (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleDownloadDocument(doc.token)}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Revisar y Pagar
                            </Button>
                          ) : doc.status === 'pagado' || doc.status === 'descargado' ? (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleDownloadDocument(doc.token)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Descargar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleViewDetails(doc)}
                            >
                              <Info className="w-4 h-4 mr-2" />
                              Ver Detalles
                            </Button>
                          )}

                          {canDeleteDocument(doc.status) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDocumentToDelete(doc.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
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

          <TabsContent value="profile" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Profile Information */}
              <Card className="shadow-card">
                <CardHeader className="pb-3 md:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <User className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    Mi Información
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:gap-4">
                    <div className="p-3 md:p-4 bg-muted/30 rounded-lg">
                      <label className="text-xs md:text-sm font-medium text-muted-foreground">Nombre completo</label>
                      <p className="font-semibold mt-1 text-sm md:text-base">{profile?.full_name || 'No especificado'}</p>
                    </div>
                    <div className="p-3 md:p-4 bg-muted/30 rounded-lg">
                      <label className="text-xs md:text-sm font-medium text-muted-foreground">Correo electrónico</label>
                      <p className="font-semibold mt-1 text-sm md:text-base break-all">{profile?.email || user?.email}</p>
                    </div>
                    <div className="p-3 md:p-4 bg-muted/30 rounded-lg">
                      <label className="text-xs md:text-sm font-medium text-muted-foreground">Teléfono</label>
                      <p className="font-semibold mt-1 text-sm md:text-base">{profile?.phone || 'No especificado'}</p>
                    </div>
                    <div className="p-3 md:p-4 bg-muted/30 rounded-lg">
                      <label className="text-xs md:text-sm font-medium text-muted-foreground">Miembro desde</label>
                      <p className="font-semibold mt-1 text-sm md:text-base">
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-CO') : 'No disponible'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security & Privacy */}
              <Card className="shadow-card">
                <CardHeader className="pb-3 md:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Shield className="w-4 h-4 md:w-5 md:h-5 text-success" />
                    Seguridad y Privacidad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-success flex-shrink-0" />
                        <span className="text-xs md:text-sm">Encriptación Activa</span>
                      </div>
                      <Badge variant="default" className="bg-success text-white text-xs">Activo</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-success flex-shrink-0" />
                        <span className="text-xs md:text-sm">Autenticación Segura</span>
                      </div>
                      <Badge variant="default" className="bg-success text-white text-xs">Verificado</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-xs md:text-sm">Datos Personales</span>
                      </div>
                      <Badge variant="outline" className="text-xs">Protegido</Badge>
                    </div>
                  </div>
                  
                  <div className="pt-3 md:pt-4 border-t space-y-2 md:space-y-3">
                    <h4 className="font-semibold text-xs md:text-sm">Gestionar cuenta</h4>
                    <div className="flex flex-col gap-2">
                      <ChangeEmailDialog
                        trigger={
                          <Button variant="outline" size="sm" className="w-full justify-start text-xs md:text-sm">
                            <Mail className="w-4 h-4 mr-2" />
                            Cambiar correo
                          </Button>
                        }
                        onChangeEmail={async (newEmail) => {
                          const { error } = await supabase.auth.updateUser({
                            email: newEmail
                          });
                          
                          if (error) {
                            toast.error('Error al cambiar correo', {
                              description: error.message
                            });
                            return { error };
                          }
                          
                          toast.success('Correo actualizado', {
                            description: 'Revisa tu nuevo correo para confirmar el cambio'
                          });
                          
                          return { error: null as any };
                        }}
                      />
                      
                      <PasswordResetDialog
                        trigger={
                          <Button variant="outline" size="sm" className="w-full justify-start text-xs md:text-sm">
                            <Lock className="w-4 h-4 mr-2" />
                            Cambiar contraseña
                          </Button>
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="pt-3 md:pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Tu información está protegida con encriptación de nivel bancario.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Onboarding Component */}
      <UserOnboardingCoachmarks
        isOpen={showOnboarding}
        onComplete={async () => {
          await markAsCompleted();
          setShowOnboarding(false);
          toast.success('¡Listo! Ya puedes usar tu portal');
        }}
        onSkip={() => {
          skipOnboarding();
          setShowOnboarding(false);
        }}
      />

      {/* Chat Widget - Solo visible para usuarios autenticados */}
      {user && (
        <div data-chat-widget>
          <ChatWidget
            isOpen={isChatOpen}
            onToggle={() => setIsChatOpen(!isChatOpen)}
          />
        </div>
      )}

      {/* Document Details Dialog */}
      <DocumentDetailsDialog
        document={selectedDocument}
        isOpen={showDocumentDetails}
        onClose={() => {
          setShowDocumentDetails(false);
          setSelectedDocument(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El documento será eliminado permanentemente de tu cuenta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => documentToDelete && handleDeleteDocument(documentToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}