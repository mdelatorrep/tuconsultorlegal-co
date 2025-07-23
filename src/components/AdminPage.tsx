import { useState, useEffect } from "react";
import { supabase } from "../integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import { toast } from "@/hooks/use-toast";
import NativeAdminLogin from "./NativeAdminLogin";
import { useNativeAdminAuth } from "../hooks/useNativeAdminAuth";
import LawyerStatsAdmin from "./LawyerStatsAdmin";
import OpenAIAgentManager from "./OpenAIAgentManager";
import LawyerBlogManager from "./LawyerBlogManager";
import SystemConfigManager from "./SystemConfigManager";
import KnowledgeBaseManager from "./KnowledgeBaseManager";
import { Copy, Users, Bot, BarChart3, Clock, CheckCircle, Lock, Unlock, Trash2, Check, X, Plus, Loader2, MessageCircle, BookOpen, Settings, Zap, Mail, Phone, Bell, LogOut, UserCheck, FileText, AlertCircle, Globe, Eye, EyeOff, Archive, Reply, User2, Timer, CreditCard, ShieldCheck, Activity, Briefcase, Calendar, Building2, Award, Coffee, Sparkles, Gavel, FileCheck, Users2, Target, TrendingUp, BookOpenCheck, Newspaper, PenTool, Send, Flag, CheckSquare, Heart, Star, Laptop, Smartphone, Headphones, HelpCircle, Shield, Zap as ZapIcon, Edit, Save } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";

interface Lawyer {
  id: string;
  name: string;
  email: string;
  created_at: string;
  is_verified: boolean;
  verification_token?: string;
  can_create_agents: boolean;
  can_create_blogs: boolean;
  can_see_business_stats: boolean;
  is_locked: boolean;
  lock_reason?: string;
  active?: boolean;
  full_name?: string;
  phone_number?: string;
  last_login_at?: string;
  lawyer_id?: string;
  access_token?: string;
}

interface Agent {
  id: string;
  name: string;
  document_name: string;
  description: string;
  category: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'active' | 'suspended';
  created_at: string;
  created_by?: string;
  suggested_price: number;
  final_price?: number;
  target_audience: string;
  template_content?: string;
  ai_prompt?: string;
  price_justification?: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
  created_at: string;
  is_read: boolean;
  status: 'pending' | 'responded' | 'archived';
  admin_notes?: string;
  responded_at?: string;
  consultation_type?: string;
}

interface TokenRequest {
  id: string;
  full_name: string;
  email: string;
  law_firm?: string;
  specialization?: string;
  years_of_experience?: number;
  reason_for_request?: string;
  phone_number?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  status: 'draft' | 'en_revision' | 'published' | 'archived';
  author_id: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
    email: string;
  };
}

function AdminPage() {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [tokenRequests, setTokenRequests] = useState<TokenRequest[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [pendingAgentsCount, setPendingAgentsCount] = useState(0);
  const [pendingBlogsCount, setPendingBlogsCount] = useState(0);
  const [pendingTokenRequests, setPendingTokenRequests] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAgentDetails, setShowAgentDetails] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [newLawyer, setNewLawyer] = useState({
    name: "",
    email: "",
    phone: "",
    canCreateAgents: false,
    canCreateBlogs: false,
    canSeeBusinessStats: false
  });

  const { isAuthenticated, isLoading: authLoading, user, session, getAuthHeaders, logout } = useNativeAdminAuth();

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadData();
    }
    setIsLoading(authLoading);
  }, [isAuthenticated, authLoading]);

  const handleLoginSuccess = () => {
    // This will trigger the useEffect to reload data
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadLawyers(),
        loadAgents(),
        loadTokenRequests(),
        loadContactMessages(),
        loadBlogPosts()
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos del administrador",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadLawyers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-lawyers-admin');
      if (error) throw error;
      setLawyers(data || []);
    } catch (error) {
      console.error('Error loading lawyers:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-agents-admin');
      if (error) throw error;
      setAgents(data || []);
      
      const pending = data?.filter((agent: any) => agent.status === 'pending_review').length || 0;
      setPendingAgentsCount(pending);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadTokenRequests = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-token-requests');
      if (error) throw error;
      setTokenRequests(data || []);
      
      const pending = data?.filter((request: any) => request.status === 'pending').length || 0;
      setPendingTokenRequests(pending);
    } catch (error) {
      console.error('Error loading token requests:', error);
    }
  };

  const loadContactMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContactMessages(data as ContactMessage[] || []);
      
      const unread = data?.filter(msg => !msg.is_read).length || 0;
      setUnreadMessagesCount(unread);
    } catch (error) {
      console.error('Error loading contact messages:', error);
    }
  };

  const loadBlogPosts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-blog-posts?action=list', {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (error) throw error;
      
      setBlogPosts(data?.blogs || []);
      const pending = data?.blogs?.filter((blog: any) => blog.status === 'en_revision').length || 0;
      setPendingBlogsCount(pending);
    } catch (error) {
      console.error('Error loading blog posts:', error);
    }
  };

  const createLawyer = async () => {
    try {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke('create-lawyer', {
        headers: getAuthHeaders(),
        body: {
          name: newLawyer.name,
          email: newLawyer.email,
          phone_number: newLawyer.phone,
          canCreateAgents: newLawyer.canCreateAgents,
          canCreateBlogs: newLawyer.canCreateBlogs,
          canSeeBusinessStats: newLawyer.canSeeBusinessStats
        }
      });

      if (error) throw error;

      setNewLawyer({ 
        name: "", 
        email: "", 
        phone: "", 
        canCreateAgents: false, 
        canCreateBlogs: false,
        canSeeBusinessStats: false 
      });
      await loadLawyers();
      
      toast({
        title: "Abogado creado exitosamente",
        description: `${newLawyer.name} ha sido registrado en el sistema jurídico`,
      });
    } catch (error: any) {
      console.error('Error creating lawyer:', error);
      toast({
        title: "Error al crear abogado",
        description: error.message || "Error inesperado al registrar el abogado en el sistema",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveAgent = async (agentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-agent', {
        headers: getAuthHeaders(),
        body: {
          agent_id: agentId,
          status: 'approved'
        }
      });

      if (error) throw error;

      toast({
        title: "Agente aprobado",
        description: "El agente legal ha sido aprobado y está disponible para uso público",
      });
      
      await loadAgents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al aprobar el agente",
        variant: "destructive"
      });
    }
  };

  const handleSuspendAgent = async (agentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-agent', {
        headers: getAuthHeaders(),
        body: {
          agent_id: agentId,
          status: 'suspended'
        }
      });

      if (error) throw error;

      toast({
        title: "Agente suspendido",
        description: "El agente ha sido suspendido temporalmente",
      });
      
      await loadAgents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al suspender el agente",
        variant: "destructive"
      });
    }
  };

  const handleActivateAgent = async (agentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-agent', {
        headers: getAuthHeaders(),
        body: {
          agent_id: agentId,
          status: 'approved'
        }
      });

      if (error) throw error;

      toast({
        title: "Agente reactivado",
        description: "El agente ha sido reactivado y está disponible nuevamente",
      });
      
      await loadAgents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al reactivar el agente",
        variant: "destructive"
      });
    }
  };

  const handleEditAgent = (agent: any) => {
    setEditingAgent({ ...agent });
    setIsEditDialogOpen(true);
  };

  const handleSaveAgentEdits = async () => {
    if (!editingAgent) return;

    try {
      const { data, error } = await supabase.functions.invoke('update-agent', {
        headers: getAuthHeaders(),
        body: {
          agent_id: editingAgent.id,
          user_id: user?.id || editingAgent.created_by,
          is_admin: true, // AdminPage always has admin permissions
          name: editingAgent.name,
          description: editingAgent.description,
          document_name: editingAgent.document_name,
          document_description: editingAgent.document_description,
          category: editingAgent.category,
          suggested_price: editingAgent.suggested_price,
          final_price: editingAgent.final_price,
          price_justification: editingAgent.price_justification,
          target_audience: editingAgent.target_audience,
          template_content: editingAgent.template_content,
          ai_prompt: editingAgent.ai_prompt
        }
      });

      if (error) throw error;

      // Actualizar la lista local
      setAgents(agents.map(agent => 
        agent.id === editingAgent.id ? editingAgent : agent
      ));

      setIsEditDialogOpen(false);
      setEditingAgent(null);

      toast({
        title: "Agente actualizado",
        description: "Los cambios se han guardado exitosamente",
      });

      await loadAgents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el agente",
        variant: "destructive"
      });
    }
  };

  const updateEditingAgentField = (field: string, value: any) => {
    if (!editingAgent) return;
    setEditingAgent({ ...editingAgent, [field]: value });
  };

  const copyLawyerToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({
      title: "Token copiado al portapapeles",
      description: "El token de acceso del abogado ha sido copiado correctamente",
    });
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;
      await loadContactMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const respondToMessage = async (messageId: string, response: string) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ 
          status: 'responded',
          admin_notes: response,
          responded_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
      
      toast({
        title: "Respuesta registrada",
        description: "La respuesta al mensaje ha sido registrada exitosamente",
      });
      
      await loadContactMessages();
    } catch (error) {
      console.error('Error responding to message:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando Panel de Administración...</p>
          <p className="text-sm text-muted-foreground">Sistema Jurídico Colombiano</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <NativeAdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Panel de Administración de Colombia</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestiona abogados, agentes legales y configuración del sistema jurídico</p>
            {user?.email && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                Administrador: {user.email}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Notificaciones */}
            <Popover open={showNotifications} onOpenChange={setShowNotifications}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="relative"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="w-4 h-4" />
                  {(unreadMessagesCount > 0 || pendingAgentsCount > 0 || pendingTokenRequests > 0) && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center">
                      {unreadMessagesCount + pendingAgentsCount + pendingTokenRequests}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Centro de Notificaciones
                  </h4>
                  <Separator />
                  
                  {unreadMessagesCount > 0 && (
                    <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm">Consultas sin responder</span>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {unreadMessagesCount}
                      </Badge>
                    </div>
                  )}
                  
                  {pendingAgentsCount > 0 && (
                    <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-orange-500" />
                        <span className="text-sm">Agentes pendientes de revisión</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {pendingAgentsCount}
                      </Badge>
                    </div>
                  )}
                  
                  {pendingTokenRequests > 0 && (
                    <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">Solicitudes de acceso pendientes</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {pendingTokenRequests}
                      </Badge>
                    </div>
                  )}
                  
                  {unreadMessagesCount === 0 && pendingAgentsCount === 0 && pendingTokenRequests === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p className="text-sm">Todo al día</p>
                      <p className="text-xs">No hay notificaciones pendientes</p>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Botón de cierre de sesión */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <LogOut className="w-5 h-5 text-red-500" />
                    Confirmar Cierre de Sesión
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Estás seguro de que deseas cerrar la sesión de administrador? 
                    Tendrás que volver a iniciar sesión para acceder al panel.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={logout}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Cerrar Sesión
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Tabs defaultValue="lawyers" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9 h-auto gap-1 p-1">
            <TabsTrigger value="lawyers" className="flex items-center gap-1 text-xs p-2">
              <Users className="w-3 h-3" />
              <span className="hidden sm:inline">Abogados</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-1 text-xs p-2">
              <Clock className="w-3 h-3" />
              <span className="hidden sm:inline">Solicitudes</span>
              {pendingTokenRequests > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground rounded-full text-xs w-4 h-4 flex items-center justify-center">
                  {pendingTokenRequests}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-1 text-xs p-2">
              <Bot className="w-3 h-3" />
              <span className="hidden sm:inline">Agentes</span>
              {pendingAgentsCount > 0 && (
                <span className="ml-1 bg-orange-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center">
                  {pendingAgentsCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="openai" className="flex items-center gap-1 text-xs p-2">
              <Zap className="w-3 h-3" />
              <span className="hidden sm:inline">IA OpenAI</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1 text-xs p-2">
              <BarChart3 className="w-3 h-3" />
              <span className="hidden sm:inline">Estadísticas</span>
            </TabsTrigger>
            <TabsTrigger value="blogs" className="flex items-center gap-1 text-xs p-2">
              <BookOpen className="w-3 h-3" />
              <span className="hidden sm:inline">Blog</span>
              {pendingBlogsCount > 0 && (
                <span className="ml-1 bg-blue-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center">
                  {pendingBlogsCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-1 text-xs p-2">
              <Settings className="w-3 h-3" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-1 text-xs p-2">
              <MessageCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Consultas</span>
              {unreadMessagesCount > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground rounded-full text-xs w-4 h-4 flex items-center justify-center">
                  {unreadMessagesCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-1 text-xs p-2">
              <Globe className="w-3 h-3" />
              <span className="hidden sm:inline">Base de Conocimiento</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lawyers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Gestión de Abogados Colombianos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                  <Input
                    placeholder="Nombre completo del abogado"
                    value={newLawyer.name}
                    onChange={(e) => setNewLawyer(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Correo electrónico"
                    type="email"
                    value={newLawyer.email}
                    onChange={(e) => setNewLawyer(prev => ({ ...prev, email: e.target.value }))}
                  />
                  <Input
                    placeholder="Número de teléfono (opcional)"
                    value={newLawyer.phone || ''}
                    onChange={(e) => setNewLawyer(prev => ({ ...prev, phone: e.target.value }))}
                  />
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newLawyer.canCreateAgents}
                        onCheckedChange={(checked) => setNewLawyer(prev => ({ ...prev, canCreateAgents: checked }))}
                      />
                      <Label className="text-xs">Crear Agentes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newLawyer.canCreateBlogs}
                        onCheckedChange={(checked) => setNewLawyer(prev => ({ ...prev, canCreateBlogs: checked }))}
                      />
                      <Label className="text-xs">Crear Blogs</Label>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newLawyer.canSeeBusinessStats}
                      onCheckedChange={(checked) => setNewLawyer(prev => ({ ...prev, canSeeBusinessStats: checked }))}
                    />
                    <Label className="text-xs">Ver Estadísticas</Label>
                  </div>
                  <Button 
                    onClick={createLawyer} 
                    disabled={!newLawyer.name || !newLawyer.email || isProcessing}
                    className="lg:col-span-6"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Registrar Abogado en el Sistema
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Abogado</TableHead>
                        <TableHead className="hidden sm:table-cell">Contacto</TableHead>
                        <TableHead className="hidden md:table-cell">Permisos Especiales</TableHead>
                        <TableHead className="hidden lg:table-cell">Última Conexión</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lawyers.map((lawyer) => (
                        <TableRow key={lawyer.id} className={!(lawyer as any).active ? 'opacity-60' : ''}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="flex items-center gap-2">
                                {(lawyer as any).full_name || lawyer.name}
                                {lawyer.can_create_agents && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    <Bot className="w-3 h-3 mr-1" />
                                    Agentes
                                  </Badge>
                                )}
                                {lawyer.can_create_blogs && (
                                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                    <BookOpen className="w-3 h-3 mr-1" />
                                    Blog
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground sm:hidden">
                                {lawyer.email}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="hidden sm:table-cell">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs">
                                <Mail className="w-3 h-3" />
                                {lawyer.email}
                              </div>
                              {(lawyer as any).phone_number && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="w-3 h-3" />
                                  {(lawyer as any).phone_number}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell className="hidden md:table-cell">
                            <div className="space-y-1">
                              <div className="flex flex-wrap gap-1">
                                {lawyer.can_create_agents && (
                                  <Badge variant="default" className="text-xs">
                                    Crear Agentes
                                  </Badge>
                                )}
                                {lawyer.can_create_blogs && (
                                  <Badge variant="secondary" className="text-xs">
                                    Crear Blogs
                                  </Badge>
                                )}
                                {lawyer.can_see_business_stats && (
                                  <Badge variant="outline" className="text-xs">
                                    Ver Estadísticas
                                  </Badge>
                                )}
                                {!lawyer.can_create_agents && !lawyer.can_create_blogs && !lawyer.can_see_business_stats && (
                                  <Badge variant="secondary" className="text-xs">
                                    Acceso Básico
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="hidden lg:table-cell">
                            <div className="text-xs">
                              {(lawyer as any).last_login_at ? (
                                <>
                                  <div>{format(new Date((lawyer as any).last_login_at), 'dd/MM/yyyy', { locale: es })}</div>
                                  <div className="text-muted-foreground">
                                    {format(new Date((lawyer as any).last_login_at), 'HH:mm', { locale: es })}
                                  </div>
                                </>
                              ) : (
                                <span className="text-muted-foreground">Nunca se ha conectado</span>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={(lawyer as any).active !== false ? 'default' : 'secondary'} className="text-xs">
                                {(lawyer as any).active !== false ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Activo
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3 mr-1" />
                                    Inactivo
                                  </>
                                )}
                              </Badge>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyLawyerToken((lawyer as any).access_token || (lawyer as any).verification_token)}
                                title="Copiar token de acceso"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              
                              <Button
                                size="sm"
                                variant={(lawyer as any).active !== false ? "outline" : "default"}
                                onClick={async () => {
                                  try {
                                    const { data, error } = await supabase.functions.invoke('update-lawyer-status', {
                                      headers: getAuthHeaders(),
                                      body: { 
                                        lawyerId: (lawyer as any).lawyer_id || lawyer.id,
                                        active: !(lawyer as any).active
                                      }
                                    });

                                    if (error) throw error;
                                    await loadLawyers();
                                    
                                    toast({
                                      title: (lawyer as any).active ? "Abogado desactivado" : "Abogado activado",
                                      description: `El abogado ha sido ${(lawyer as any).active ? 'desactivado' : 'activado'} exitosamente`,
                                    });
                                  } catch (error: any) {
                                    toast({
                                      title: "Error",
                                      description: error.message || "Error al cambiar el estado del abogado",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                title={(lawyer as any).active ? "Desactivar" : "Activar"}
                              >
                                {(lawyer as any).active ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  const lawyerName = (lawyer as any).full_name || lawyer.name;
                                  if (!confirm(`¿Estás seguro de que deseas eliminar al abogado "${lawyerName}"?`)) return;
                                  
                                  try {
                                    const { data, error } = await supabase.functions.invoke('delete-lawyer', {
                                      headers: getAuthHeaders(),
                                      body: { lawyerId: (lawyer as any).lawyer_id || lawyer.id }
                                    });

                                    if (error) throw error;

                                    toast({
                                      title: "Abogado eliminado",
                                      description: `${lawyerName} ha sido eliminado exitosamente`,
                                    });

                                    await loadLawyers();
                                  } catch (error: any) {
                                    toast({
                                      title: "Error",
                                      description: error.message || "Error al eliminar el abogado",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Solicitudes de Token de Abogados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead className="hidden md:table-cell">Empresa</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tokenRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{request.full_name}</div>
                              <div className="text-xs text-muted-foreground sm:hidden">{request.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{request.email}</TableCell>
                          <TableCell className="hidden md:table-cell">{request.law_firm || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={
                              request.status === 'approved' ? 'default' :
                              request.status === 'rejected' ? 'destructive' : 'outline'
                            }>
                              {request.status === 'approved' ? 'Aprobado' :
                               request.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {request.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const { data, error } = await supabase.functions.invoke('manage-token-request', {
                                          body: {
                                            action: 'approve',
                                            requestId: request.id
                                          }
                                        });
                                        if (error) throw error;
                                        await loadTokenRequests();
                                        toast({
                                          title: "Solicitud aprobada",
                                          description: "El token de abogado ha sido generado",
                                        });
                                      } catch (error: any) {
                                        toast({
                                          title: "Error",
                                          description: error.message || "Error al aprobar la solicitud",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={async () => {
                                      const reason = prompt('Razón del rechazo:');
                                      if (!reason) return;
                                      try {
                                        const { data, error } = await supabase.functions.invoke('manage-token-request', {
                                          body: {
                                            action: 'reject',
                                            requestId: request.id,
                                            rejectionReason: reason
                                          }
                                        });
                                        if (error) throw error;
                                        await loadTokenRequests();
                                        toast({
                                          title: "Solicitud rechazada",
                                          description: "La solicitud ha sido rechazada",
                                        });
                                      } catch (error: any) {
                                        toast({
                                          title: "Error",
                                          description: error.message || "Error al rechazar la solicitud",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Gestión de Agentes Legales
                  <Badge variant="outline" className="ml-auto">
                    {agents.length} Total
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Estadísticas de Agentes */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Pendientes de Revisión</p>
                        <p className="font-bold text-lg">{agents.filter(a => a.status === 'pending_review').length}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Activos</p>
                        <p className="font-bold text-lg">{agents.filter(a => a.status === 'approved' || a.status === 'active').length}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Suspendidos</p>
                        <p className="font-bold text-lg">{agents.filter(a => a.status === 'suspended').length}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Para Empresas</p>
                        <p className="font-bold text-lg">{agents.filter(a => a.target_audience === 'empresas').length}</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Lista de Agentes */}
                <div className="space-y-3">
                  {agents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No hay agentes registrados en el sistema</p>
                      <p className="text-sm">Los agentes aparecerán aquí cuando los abogados los creen</p>
                    </div>
                  ) : (
                    agents.map((agent) => (
                      <Card key={agent.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-lg">{agent.name}</h4>
                              <Badge variant={
                                agent.status === 'pending_review' ? 'destructive' :
                                agent.status === 'approved' || agent.status === 'active' ? 'default' :
                                agent.status === 'suspended' ? 'secondary' : 'outline'
                              }>
                                {agent.status === 'pending_review' ? 'Pendiente de Revisión' :
                                 agent.status === 'approved' || agent.status === 'active' ? 'Activo' :
                                 agent.status === 'suspended' ? 'Suspendido' : agent.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {agent.target_audience === 'empresas' ? 'Empresas' : 'Personas'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Documento:</p>
                                <p className="font-medium">{agent.document_name || agent.name}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Categoría:</p>
                                <p className="font-medium">{agent.category}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Precio:</p>
                                <p className="font-medium">
                                  ${agent.final_price || agent.suggested_price} COP
                                </p>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {agent.description}
                            </p>
                            
                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(agent.created_at), 'dd MMM yyyy', { locale: es })}
                              </span>
                              {agent.created_by && (
                                <span className="flex items-center gap-1">
                                  <User2 className="w-3 h-3" />
                                  Creado por abogado
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-4">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedAgent(agent);
                                setShowAgentDetails(true);
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Ver Detalles
                            </Button>
                            
                            {agent.status === 'pending_review' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditAgent(agent)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Editar
                              </Button>
                            )}
                            
                            {agent.status === 'pending_review' && (
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => handleApproveAgent(agent.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Aprobar
                              </Button>
                            )}
                            
                            {(agent.status === 'approved' || agent.status === 'active') && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleSuspendAgent(agent.id)}
                              >
                                <Lock className="w-3 h-3 mr-1" />
                                Suspender
                              </Button>
                            )}
                            
                            {agent.status === 'suspended' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleActivateAgent(agent.id)}
                              >
                                <Unlock className="w-3 h-3 mr-1" />
                                Reactivar
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="openai">
            <OpenAIAgentManager />
          </TabsContent>

          <TabsContent value="stats">
            <LawyerStatsAdmin authHeaders={getAuthHeaders()} />
          </TabsContent>

          <TabsContent value="blogs">
            <LawyerBlogManager onBack={() => {}} lawyerData={{ email: user?.email, name: user?.email }} />
          </TabsContent>

          <TabsContent value="config">
            <SystemConfigManager />
          </TabsContent>

          <TabsContent value="knowledge">
            <KnowledgeBaseManager />
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Consultas de Usuarios
                  <Badge variant="outline" className="ml-auto">
                    {contactMessages.length} Total
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contactMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No hay consultas de usuarios</p>
                    </div>
                  ) : (
                    contactMessages.map((message) => (
                      <Card key={message.id} className={`p-4 ${!message.is_read ? 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold">{message.name}</h4>
                              <Badge variant={
                                message.status === 'pending' ? 'destructive' :
                                message.status === 'responded' ? 'default' : 'secondary'
                              }>
                                {message.status === 'pending' ? 'Pendiente' :
                                 message.status === 'responded' ? 'Respondido' : 'Archivado'}
                              </Badge>
                              {!message.is_read && (
                                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                  Nuevo
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                              <div>
                                <p className="text-muted-foreground">Email:</p>
                                <p className="font-medium">{message.email}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Teléfono:</p>
                                <p className="font-medium">{message.phone || 'No proporcionado'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Tipo de Consulta:</p>
                                <p className="font-medium">{message.consultation_type || 'General'}</p>
                              </div>
                            </div>
                            
                            <p className="text-sm mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              {message.message}
                            </p>
                            
                            {message.admin_notes && (
                              <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Respuesta del Administrador:</p>
                                <p className="text-sm text-green-700 dark:text-green-300">{message.admin_notes}</p>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(message.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                              </span>
                              {message.responded_at && (
                                <span className="flex items-center gap-1">
                                  <Reply className="w-3 h-3" />
                                  Respondido: {format(new Date(message.responded_at), 'dd MMM yyyy', { locale: es })}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-4">
                            {!message.is_read && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => markMessageAsRead(message.id)}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Marcar Leído
                              </Button>
                            )}
                            
                            {message.status === 'pending' && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="default">
                                    <Reply className="w-3 h-3 mr-1" />
                                    Responder
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Responder Consulta</DialogTitle>
                                    <DialogDescription>
                                      Responder a la consulta de {message.name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Consulta Original:</Label>
                                      <p className="text-sm p-2 bg-gray-100 dark:bg-gray-800 rounded">{message.message}</p>
                                    </div>
                                    <div>
                                      <Label htmlFor="response">Tu Respuesta:</Label>
                                      <Textarea 
                                        id="response"
                                        placeholder="Escribe tu respuesta aquí..."
                                        className="mt-1"
                                      />
                                    </div>
                                    <Button 
                                      onClick={(e) => {
                                        const response = (e.target as any).closest('.space-y-4').querySelector('textarea').value;
                                        if (response.trim()) {
                                          respondToMessage(message.id, response);
                                        }
                                      }}
                                    >
                                      Enviar Respuesta
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog para editar agente */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Editar Agente Legal
            </DialogTitle>
            <DialogDescription>
              Modificar los detalles del agente antes de su aprobación
            </DialogDescription>
          </DialogHeader>
          
          {editingAgent && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agent-name">Nombre del Agente</Label>
                  <Input
                    id="agent-name"
                    value={editingAgent.name}
                    onChange={(e) => updateEditingAgentField('name', e.target.value)}
                    placeholder="Nombre del agente legal"
                  />
                </div>
                
                <div>
                  <Label htmlFor="document-name">Nombre del Documento</Label>
                  <Input
                    id="document-name"
                    value={editingAgent.document_name || ''}
                    onChange={(e) => updateEditingAgentField('document_name', e.target.value)}
                    placeholder="Nombre del documento generado"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="agent-description">Descripción del Agente</Label>
                <Textarea
                  id="agent-description"
                  value={editingAgent.description}
                  onChange={(e) => updateEditingAgentField('description', e.target.value)}
                  placeholder="Descripción detallada del agente"
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <Label htmlFor="document-description">Descripción del Documento</Label>
                <Textarea
                  id="document-description"
                  value={editingAgent.document_description || ''}
                  onChange={(e) => updateEditingAgentField('document_description', e.target.value)}
                  placeholder="Descripción del documento que genera"
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={editingAgent.category} onValueChange={(value) => updateEditingAgentField('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contratos">Contratos</SelectItem>
                      <SelectItem value="laboral">Laboral</SelectItem>
                      <SelectItem value="civil">Civil</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="penal">Penal</SelectItem>
                      <SelectItem value="inmobiliario">Inmobiliario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="target-audience">Audiencia Objetivo</Label>
                  <Select value={editingAgent.target_audience || 'personas'} onValueChange={(value) => updateEditingAgentField('target_audience', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar audiencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personas">Personas Naturales</SelectItem>
                      <SelectItem value="empresas">Empresas</SelectItem>
                      <SelectItem value="ambos">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="suggested-price">Precio Sugerido (COP)</Label>
                  <Input
                    id="suggested-price"
                    type="number"
                    value={editingAgent.suggested_price}
                    onChange={(e) => updateEditingAgentField('suggested_price', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="final-price">Precio Final (COP)</Label>
                  <Input
                    id="final-price"
                    type="number"
                    value={editingAgent.final_price || ''}
                    onChange={(e) => updateEditingAgentField('final_price', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="price-justification">Justificación del Precio</Label>
                <Textarea
                  id="price-justification"
                  value={editingAgent.price_justification || ''}
                  onChange={(e) => updateEditingAgentField('price_justification', e.target.value)}
                  placeholder="Justificación del precio establecido"
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="template-content">Contenido de la Plantilla</Label>
                <Textarea
                  id="template-content"
                  value={editingAgent.template_content}
                  onChange={(e) => updateEditingAgentField('template_content', e.target.value)}
                  placeholder="Plantilla del documento"
                  className="min-h-[150px] font-mono"
                />
              </div>

              <div>
                <Label htmlFor="ai-prompt">Prompt de IA</Label>
                <Textarea
                  id="ai-prompt"
                  value={editingAgent.ai_prompt}
                  onChange={(e) => updateEditingAgentField('ai_prompt', e.target.value)}
                  placeholder="Instrucciones para la IA"
                  className="min-h-[120px]"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  onClick={handleSaveAgentEdits}
                  className="flex-1 sm:flex-none"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
                
                {editingAgent.status === 'pending_review' && (
                  <Button 
                    onClick={() => {
                      handleApproveAgent(editingAgent.id);
                      setIsEditDialogOpen(false);
                    }}
                    className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Guardar y Aprobar
                  </Button>
                )}
                
                <Button 
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1 sm:flex-none"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para detalles del agente */}
      <Dialog open={showAgentDetails} onOpenChange={setShowAgentDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Detalles del Agente Legal
            </DialogTitle>
            <DialogDescription>
              Información completa del agente legal
            </DialogDescription>
          </DialogHeader>
          
          {selectedAgent && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Nombre del Agente</Label>
                  <p className="text-lg font-semibold">{selectedAgent.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Estado</Label>
                  <Badge variant={
                    selectedAgent.status === 'pending_review' ? 'destructive' :
                    selectedAgent.status === 'approved' || selectedAgent.status === 'active' ? 'default' :
                    'secondary'
                  }>
                    {selectedAgent.status === 'pending_review' ? 'Pendiente de Revisión' :
                     selectedAgent.status === 'approved' || selectedAgent.status === 'active' ? 'Activo' :
                     'Suspendido'}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Descripción</Label>
                <p className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">{selectedAgent.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Categoría</Label>
                  <p>{selectedAgent.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Audiencia Objetivo</Label>
                  <p>{selectedAgent.target_audience === 'empresas' ? 'Empresas' : 'Personas'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Precio Sugerido</Label>
                  <p>${selectedAgent.suggested_price} COP</p>
                </div>
                {selectedAgent.final_price && (
                  <div>
                    <Label className="text-sm font-medium">Precio Final</Label>
                    <p>${selectedAgent.final_price} COP</p>
                  </div>
                )}
              </div>
              
              {selectedAgent.template_content && (
                <div>
                  <Label className="text-sm font-medium">Contenido de la Plantilla</Label>
                  <Textarea 
                    value={selectedAgent.template_content}
                    readOnly
                    className="mt-1 min-h-[200px]"
                  />
                </div>
              )}
              
              {selectedAgent.ai_prompt && (
                <div>
                  <Label className="text-sm font-medium">Prompt de IA</Label>
                  <Textarea 
                    value={selectedAgent.ai_prompt}
                    readOnly
                    className="mt-1 min-h-[100px]"
                  />
                </div>
              )}
              
              {selectedAgent.price_justification && (
                <div>
                  <Label className="text-sm font-medium">Justificación del Precio</Label>
                  <p className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">{selectedAgent.price_justification}</p>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Creado el {format(new Date(selectedAgent.created_at), 'dd MMMM yyyy', { locale: es })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminPage;
