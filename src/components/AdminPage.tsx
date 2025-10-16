import { useState, useEffect } from "react";
import { supabase } from "../integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { AuthStorage } from "@/utils/authStorage";
import NativeAdminLogin from "./NativeAdminLogin";
import { useNativeAdminAuth } from "../hooks/useNativeAdminAuth";
import LawyerStatsAdmin from "./LawyerStatsAdmin";
import OpenAIAgentManager from "./OpenAIAgentManager";
import LawyerBlogManager from "./LawyerBlogManager";
import AdminBlogManager from "./AdminBlogManager";
import SystemConfigManager from "./SystemConfigManager";
import KnowledgeBaseManager from "./KnowledgeBaseManager";
import LawyerTrainingManager from "./LawyerTrainingManager";
import CategoryManager from "./CategoryManager";
import SubscriptionAdminManager from "./admin/SubscriptionAdminManager";
import { EmailConfigManager } from "./admin/EmailConfigManager";
import { 
  Copy, Users, Bot, BarChart3, Clock, CheckCircle, Lock, Unlock, Trash2, Check, X, Plus, 
  Loader2, MessageCircle, BookOpen, Settings, Zap, Mail, Phone, Bell, LogOut, UserCheck, 
  FileText, AlertCircle, Globe, Eye, EyeOff, Archive, Reply, User2, Timer, CreditCard, 
  ShieldCheck, Activity, Briefcase, Calendar, Building2, Award, Coffee, Sparkles, Gavel, 
  FileCheck, Users2, Target, TrendingUp, BookOpenCheck, Newspaper, PenTool, Send, Flag, 
  CheckSquare, Heart, Star, Laptop, Smartphone, Headphones, HelpCircle, Shield, 
  Zap as ZapIcon, Edit, Save, Tag, Menu, UserCog, Cog, Database, FolderOpen, Play, Brain
} from "lucide-react";
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
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "./ui/sidebar";
import LawyerPermissionsDialog from './LawyerPermissionsDialog';

interface Lawyer {
  id: string;
  name: string;
  email: string;
  full_name: string;
  created_at: string;
  is_verified?: boolean;
  verification_token?: string;
  can_create_agents: boolean;
  can_create_blogs: boolean;
  can_use_ai_tools: boolean;
  is_locked?: boolean;
  lock_reason?: string;
  active: boolean;
  phone_number?: string;
  last_login_at?: string;
  lawyer_id?: string;
  
}

interface Agent {
  id: string;
  name: string;
  document_name: string;
  description: string;
  category: string;
  status: 'pending_review' | 'approved' | 'active' | 'rejected' | 'suspended';
  created_at: string;
  created_by?: string;
  price: number;
  target_audience: string;
  template_content?: string;
  ai_prompt?: string;
  price_justification?: string;
}

interface ConversationBlock {
  id: string;
  block_name: string;
  intro_phrase: string;
  block_order: number;
  placeholders: any[];
  legal_agent_id?: string;
}

interface FieldInstruction {
  id?: string;
  field_name: string;
  validation_rule?: string | null;
  help_text?: string | null;
  legal_agent_id?: string;
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
  
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<{name: string; value: string}[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [pendingAgentsCount, setPendingAgentsCount] = useState(0);
  const [pendingBlogsCount, setPendingBlogsCount] = useState(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecreatingAgent, setIsRecreatingAgent] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAgentDetails, setShowAgentDetails] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedLawyerForPermissions, setSelectedLawyerForPermissions] = useState<Lawyer | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);

  // Conversación del agente (Guía)
  const [convBlocks, setConvBlocks] = useState<ConversationBlock[]>([]);
  const [fieldInstructions, setFieldInstructions] = useState<FieldInstruction[]>([]);
  const [isConvLoading, setIsConvLoading] = useState(false);
  const [newLawyer, setNewLawyer] = useState({
    name: "",
    email: "",
    phone: "",
    canCreateAgents: false,
    canCreateBlogs: false
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

  // Cargar guía de conversación al abrir el detalle
  useEffect(() => {
    if (showAgentDetails && selectedAgent?.id) {
      loadConversationGuide(selectedAgent.id);
    }
  }, [showAgentDetails, selectedAgent?.id]);
  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadLawyers(),
        loadAgents(),
        
        loadContactMessages(),
        loadBlogPosts(),
        loadCategories()
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
      const { data, error } = await supabase.functions.invoke('get-lawyers-admin', {
        headers: getAuthHeaders()
      });
      if (error) throw error;
      setLawyers(data || []);
    } catch (error) {
      console.error('Error loading lawyers:', error);
    }
  };

  // Función para copiar la clave del abogado al portapapeles
  const handleCopyLawyerInfo = async (lawyer: Lawyer) => {
    try {
      await navigator.clipboard.writeText(lawyer.id);
      
      toast({
        title: "Clave copiada",
        description: `Clave de ${lawyer.full_name} copiada al portapapeles`,
      });
    } catch (error) {
      console.error('Error copying lawyer key:', error);
      toast({
        title: "Error",
        description: "No se pudo copiar la clave",
        variant: "destructive",
      });
    }
  };

  // Función para actualizar estado de agente
  const handleUpdateAgentStatus = async (agentId: string, newStatus: string) => {
    if (!agentId || !newStatus) {
      console.error('FALLO: El ID del agente o el nuevo estado no están definidos.');
      return;
    }
    
    try {
      const authHeaders = getAuthHeaders();
      if (!authHeaders.authorization) {
        throw new Error('No se encontró token de autenticación');
      }

      // Obtener los datos del agente actual
      const agent = agents.find(a => a.id === agentId);
      if (!agent) {
        throw new Error('Agente no encontrado');
      }

      const bodyPayload = {
        agent_id: agentId,
        status: newStatus,
        user_id: user?.id || 'admin_override',
        is_admin: true,
        document_name: agent.name // Copiar el nombre del agente al nombre del documento
      };

      const response = await supabase.functions.invoke('update-agent', {
        body: bodyPayload,
        headers: authHeaders
      });
      
      if (response.error) {
        console.error('Error from update-agent function:', response.error);
        throw new Error(response.error.message || 'Error al actualizar el estado del agente');
      }

      if (response.data?.error) {
        console.error('Error in response data:', response.data.error);
        throw new Error(response.data.error);
      }

      // Si estamos aprobando, crear el agente de OpenAI de forma síncrona
      if (newStatus === 'approved') {
        try {
          console.log('Creating OpenAI agent for approved agent:', agentId);
          const { data: openaiAgentResult, error: openaiError } = await supabase.functions.invoke('create-openai-agent', {
            body: {
              legal_agent_id: agentId,
              force_recreate: false
            },
            headers: authHeaders
          });

          if (openaiError) {
            console.error('Error creating OpenAI agent:', openaiError);
            toast({
              title: "Advertencia",
              description: "Agente aprobado pero falló la creación del agente OpenAI. Usa el botón 'Recrear OpenAI'",
              variant: "destructive",
            });
          } else if (openaiAgentResult?.success) {
            console.log('✅ OpenAI agent created successfully');
            
            // **NUEVO: Actualizar openai_enabled en la UI inmediatamente**
            setAgents(prevAgents =>
              prevAgents.map(a =>
                a.id === agentId ? { ...a, openai_enabled: true } : a
              )
            );
            
            toast({
              title: "Agente OpenAI Creado",
              description: `El agente OpenAI ha sido creado exitosamente`,
            });
          }
        } catch (error) {
          console.error('Exception creating OpenAI agent:', error);
        }
      } else {
        // Para otros cambios de estado (no aprobación)
        toast({
          title: "Estado actualizado",
          description: `El agente ha sido ${newStatus === 'active' ? 'activado' : newStatus === 'approved' ? 'aprobado' : newStatus === 'suspended' ? 'suspendido' : 'actualizado'} exitosamente`,
        });
      }

      await loadAgents();
    } catch (error: any) {
      console.error('Error updating agent status:', error);
      toast({
        title: "Error",
        description: `No se pudo actualizar el estado del agente: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Función para eliminar agente
  const handleDeleteAgent = async (agent: Agent) => {
    try {
      const authHeaders = getAuthHeaders();
      if (!authHeaders.authorization) {
        throw new Error('No se encontró token de autenticación');
      }

      console.log('🗑️ Deleting agent:', agent.name);

      const { data, error } = await supabase.functions.invoke('delete-agent', {
        body: {
          agent_id: agent.id,
          user_id: user?.id || 'admin_override',
          is_admin: true
        },
        headers: authHeaders
      });

      if (error) {
        console.error('❌ Error from delete-agent function:', error);
        throw new Error(error.message);
      }

      if (data?.error) {
        console.error('❌ Error from delete-agent response:', data.error);
        throw new Error(data.error);
      }

      console.log('✅ Agent deleted successfully:', data);

      toast({
        title: "Agente eliminado",
        description: data?.message || `${agent.name} ha sido eliminado exitosamente`,
      });

      await loadAgents();
    } catch (error: any) {
      console.error('💥 Error deleting agent:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el agente",
        variant: "destructive",
      });
    }
  };

  // Función para recrear agente de OpenAI
  const handleRecreateOpenAIAgent = async (agentId: string, agentName: string) => {
    setIsRecreatingAgent(true);
    sonnerToast.loading(`Recreando agente OpenAI para "${agentName}"...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-openai-agent', {
        body: {
          legal_agent_id: agentId,
          force_recreate: true
        }
      });

      if (error) {
        throw new Error(error.message || 'Error al recrear el agente');
      }

      if (data?.success) {
        sonnerToast.success(`✅ Agente OpenAI recreado exitosamente: ${data.openai_agent_id}`);
        await loadAgents();
        
        toast({
          title: "Agente Recreado",
          description: `El agente "${agentName}" ha sido recreado con las instrucciones actualizadas.`,
        });
      } else {
        throw new Error(data?.error || 'Error desconocido al recrear el agente');
      }
    } catch (error) {
      console.error('Error recreating OpenAI agent:', error);
      sonnerToast.error(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      toast({
        title: "Error",
        description: "No se pudo recrear el agente OpenAI",
        variant: "destructive",
      });
    } finally {
      setIsRecreatingAgent(false);
    }
  };

  // Función para manejar la edición de agentes
  const handleEditFieldChange = (field: string, value: any) => {
    if (!editingAgent) return;
    setEditingAgent({ ...editingAgent, [field]: value });
  };

  const handleSaveAgent = async () => {
    // Freeze the current state to prevent race conditions
    const agentToSave = editingAgent;

    if (!agentToSave?.id) {
      console.error('❌ No agent selected for editing');
      toast({ 
        title: "Error", 
        description: "No hay agente seleccionado para editar.", 
        variant: "destructive" 
      });
      return;
    }

    console.log('🚀 Starting handleSaveAgent for agent:', agentToSave.id);
    console.log('🔍 Agent data:', {
      id: agentToSave.id,
      name: agentToSave.name,
      status: agentToSave.status
    });

    try {
      // Verificar si la sesión está activa primero
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        console.error('❌ No active session found');
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }

      // Get auth headers
      const authHeaders = getAuthHeaders();
      if (!authHeaders.authorization) {
        console.error('❌ No authorization token found');
        throw new Error('No se encontró token de autenticación válido.');
      }

      console.log('🔑 Auth headers:', { hasToken: !!authHeaders.authorization });

      // Prepare the payload with all agent data
      const updatePayload = {
        agent_id: agentToSave.id,
        user_id: user?.id,
        is_admin: true,
        name: agentToSave.name,
        description: agentToSave.description,
        document_name: agentToSave.document_name,
        document_description: agentToSave.document_description,
        category: agentToSave.category,
        price: agentToSave.price,
        price_justification: agentToSave.price_justification,
        target_audience: agentToSave.target_audience,
        template_content: agentToSave.template_content,
        ai_prompt: agentToSave.ai_prompt,
        sla_enabled: agentToSave.sla_enabled,
        sla_hours: agentToSave.sla_hours,
        button_cta: agentToSave.button_cta,
        placeholder_fields: agentToSave.placeholder_fields,
        frontend_icon: agentToSave.frontend_icon,
        status: agentToSave.status
      };

      console.log('📦 Payload prepared with fields:', Object.keys(updatePayload));

      // Call the update-agent function
      console.log('📡 Calling update-agent function...');
      const { data, error } = await supabase.functions.invoke('update-agent', {
        body: updatePayload,
        headers: authHeaders
      });

      console.log('📥 Function response:', { data, error });

      // Handle function-level errors
      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(`Error de función: ${error.message}`);
      }

      // Handle application-level errors
      if (!data?.success) {
        console.error('❌ Application error:', data);
        throw new Error(data?.error || 'Error desconocido al actualizar el agente');
      }

      console.log('✅ Agent updated successfully');

      // Show success message
      toast({
        title: "Agente actualizado",
        description: "El agente ha sido actualizado correctamente.",
        variant: "default"
      });

      // Reload agents and close dialog
      console.log('🔄 Reloading agents list...');
      await loadAgents();
      
      setIsEditDialogOpen(false);
      setEditingAgent(null);
      
      console.log('✅ Process completed successfully');

    } catch (error: any) {
      console.error('💥 Error in handleSaveAgent:', error);
      
      // Show user-friendly error message
      let errorMessage = "No se pudo actualizar el agente.";
      
      if (error.message?.includes('token')) {
        errorMessage = "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.";
      } else if (error.message?.includes('permissions')) {
        errorMessage = "No tienes permisos para realizar esta acción.";
      } else if (error.message?.includes('not found')) {
        errorMessage = "El agente no fue encontrado.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error al guardar cambios",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Función para eliminar abogado
  const handleDeleteLawyer = async (lawyer: Lawyer) => {
    try {
      console.log('🗑️ Iniciando eliminación de abogado:', lawyer.full_name);

      const response = await supabase.functions.invoke('delete-lawyer', {
        body: {
          lawyer_id: lawyer.id, // Usando el ID del abogado
          lawyerId: lawyer.id    // También enviando como lawyerId para compatibilidad
        }
      });

      console.log('Response from delete-lawyer:', response);

      if (response.error) {
        console.error('Error from delete-lawyer function:', response.error);
        throw new Error(response.error.message || 'Error al eliminar abogado');
      }

      if (response.data?.error) {
        console.error('Error in response data:', response.data.error);
        throw new Error(response.data.error);
      }

      toast({
        title: "Abogado eliminado",
        description: `${lawyer.full_name} ha sido eliminado exitosamente`,
      });

      // Recargar la lista de abogados
      await loadLawyers();

    } catch (error) {
      console.error('Error deleting lawyer:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el abogado",
        variant: "destructive",
      });
    }
  };

  const loadAgents = async () => {
    try {
      console.log('🔄 Loading agents with admin authentication...');
      
      const response = await supabase.functions.invoke('get-agents-admin', {
        headers: getAuthHeaders()
      });

      if (response.error) {
        console.error('Error from get-agents-admin:', response.error);
        throw new Error(response.error.message || 'Error al cargar agentes');
      }
      
      const agentsData = response.data || [];
      console.log('✅ Loaded agents:', agentsData.length);
      
      setAgents(agentsData);
      
      const pending = agentsData.filter((agent: any) => agent.status === 'pending_review').length || 0;
      setPendingAgentsCount(pending);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los agentes legales",
        variant: "destructive"
      });
    }
  };

  // Carga la guía de conversación de un agente (bloques e instrucciones)
  const loadConversationGuide = async (agentId: string) => {
    try {
      setIsConvLoading(true);
      setConvBlocks([]);
      setFieldInstructions([]);

      const { data, error } = await supabase.functions.invoke('get-agent-conversation', {
        body: { legal_agent_id: agentId },
        headers: getAuthHeaders()
      });

      if (error) throw error;

      setConvBlocks(data?.conversation_blocks || []);
      setFieldInstructions(data?.field_instructions || []);
    } catch (error) {
      console.error('Error loading conversation guide:', error);
    } finally {
      setIsConvLoading(false);
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

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('document_categories')
        .select('name')
        .eq('is_active', true)
        .in('category_type', ['document', 'both'])
        .order('display_order')
        .order('name');

      if (error) throw error;
      
      const categoriesData = data?.map(cat => ({
        name: cat.name,
        value: cat.name.toLowerCase().replace(/\s+/g, '_')
      })) || [];

      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
      const fallbackCategories = [
        { name: 'Contratos', value: 'contratos' },
        { name: 'Laboral', value: 'laboral' },
        { name: 'Civil', value: 'civil' },
        { name: 'Comercial', value: 'comercial' },
        { name: 'Penal', value: 'penal' }
      ];
      setCategories(fallbackCategories);
    }
  };

  // Configuración del sidebar con módulos reorganizados
  const sidebarSections = [
    {
      label: "Vista General",
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Activity, count: 0 },
      ]
    },
    {
      label: "Gestión de Usuarios",
      items: [
        { id: 'lawyers', label: 'Abogados', icon: Users, count: 0 },
      ]
    },
    {
      label: "IA & Agentes",
      items: [
        { id: 'agents', label: 'Agentes Legales', icon: Bot, count: pendingAgentsCount },
        { id: 'openai', label: 'Configuración OpenAI', icon: Zap, count: 0 },
      ]
    },
    {
      label: "Contenido & Comunicación",
      items: [
        { id: 'blogs', label: 'Blog Jurídico', icon: BookOpen, count: pendingBlogsCount },
        { id: 'messages', label: 'Consultas de Usuarios', icon: MessageCircle, count: unreadMessagesCount },
      ]
    },
    {
      label: "Sistema & Configuración",
      items: [
        { id: 'knowledge', label: 'Base de Conocimiento', icon: Database, count: 0 },
        { id: 'categories', label: 'Categorías', icon: Tag, count: 0 },
        { id: 'subscriptions', label: 'Gestión Suscripciones', icon: CreditCard, count: 0 },
        { id: 'email-config', label: 'Configuración Email', icon: Mail, count: 0 },
        { id: 'stats', label: 'Estadísticas Avanzadas', icon: BarChart3, count: 0 },
        { id: 'config', label: 'Configuración Sistema', icon: Settings, count: 0 },
      ]
    }
  ];

  const currentSection = sidebarSections.flatMap(s => s.items).find(item => item.id === currentView);

  const AdminSidebar = () => {
    return (
      <Sidebar className="w-64" collapsible="icon">
        <SidebarTrigger className="m-2 self-end" />
        
        <SidebarContent>
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm text-foreground">Panel de Administración</h2>
            <p className="text-xs text-muted-foreground">Sistema Jurídico Colombiano</p>
            {user?.email && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                {user.email}
              </p>
            )}
          </div>

          {sidebarSections.map((section) => (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
                {section.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton 
                        isActive={currentView === item.id}
                        onClick={() => setCurrentView(item.id)}
                        className="w-full justify-start"
                      >
                        <item.icon className="w-4 h-4 mr-2" />
                        <span className="flex-1">{item.label}</span>
                        {item.count > 0 && (
                          <Badge variant="destructive" className="ml-auto text-xs">
                            {item.count}
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>
    );
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
          canCreateBlogs: newLawyer.canCreateBlogs
        }
      });

      if (error) throw error;

      setNewLawyer({ 
        name: "", 
        email: "", 
        phone: "", 
        canCreateAgents: false, 
        canCreateBlogs: false
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

  if (isLoading || authLoading) {
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

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Abogados</p>
                    <p className="text-2xl font-bold">{lawyers.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Agentes Activos</p>
                    <p className="text-2xl font-bold">{agents.filter(a => a.status === 'active').length}</p>
                  </div>
                  <Bot className="w-8 h-8 text-green-500" />
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Consultas Pendientes</p>
                    <p className="text-2xl font-bold">{unreadMessagesCount}</p>
                  </div>
                  <MessageCircle className="w-8 h-8 text-orange-500" />
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center justify-between">
                </div>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Actividad Reciente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {agents.slice(0, 5).map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Bot className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">{agent.name}</p>
                            <p className="text-xs text-muted-foreground">{agent.category}</p>
                          </div>
                        </div>
                        <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                          {agent.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Estadísticas del Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Agentes Pendientes</span>
                      <div className="flex items-center gap-2">
                        <Progress value={(pendingAgentsCount / Math.max(agents.length, 1)) * 100} className="w-20" />
                        <span className="text-sm font-medium">{pendingAgentsCount}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Blogs en Revisión</span>
                      <div className="flex items-center gap-2">
                        <Progress value={(pendingBlogsCount / Math.max(blogPosts.length, 1)) * 100} className="w-20" />
                        <span className="text-sm font-medium">{pendingBlogsCount}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Consultas Sin Responder</span>
                      <div className="flex items-center gap-2">
                        <Progress value={(unreadMessagesCount / Math.max(contactMessages.length, 1)) * 100} className="w-20" />
                        <span className="text-sm font-medium">{unreadMessagesCount}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      
      case 'lawyers':
        return (
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
                      <TableHead className="hidden md:table-cell">Permisos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lawyers.map((lawyer) => (
                      <TableRow key={lawyer.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="flex items-center gap-2">
                              {(lawyer as any).full_name || lawyer.name}
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
                            <div className="flex flex-wrap gap-1">
                              {lawyer.can_create_agents && (
                                <Badge variant="outline" className="text-xs">
                                  <Bot className="w-3 h-3 mr-1" />
                                  Agentes
                                </Badge>
                              )}
                              {lawyer.can_create_blogs && (
                                <Badge variant="outline" className="text-xs">
                                  <BookOpen className="w-3 h-3 mr-1" />
                                  Blog
                                </Badge>
                              )}
                              {lawyer.can_use_ai_tools && (
                                <Badge variant="outline" className="text-xs">
                                  <Brain className="w-3 h-3 mr-1" />
                                  IA Tools
                                </Badge>
                              )}
                               {!lawyer.can_create_agents && !lawyer.can_create_blogs && !lawyer.can_use_ai_tools && (
                                 <Badge variant="secondary" className="text-xs">
                                   <X className="w-3 h-3 mr-1" />
                                   Sin permisos
                                 </Badge>
                               )}
                            </div>
                         </TableCell>
                        
                        <TableCell>
                          <Badge variant={(lawyer as any).active ? "default" : "secondary"}>
                            {(lawyer as any).active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedLawyerForPermissions(lawyer);
                setPermissionsDialogOpen(true);
              }}
              title="Editar permisos"
            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              title="Copiar información"
                              onClick={() => handleCopyLawyerInfo(lawyer)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" title="Eliminar abogado">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar abogado?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción eliminará permanentemente la cuenta de <strong>{lawyer.full_name}</strong> 
                                    ({lawyer.email}). Esta acción no se puede deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteLawyer(lawyer)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
        
      case 'stats':
        return <LawyerStatsAdmin authHeaders={getAuthHeaders()} />;
        
      case 'agents':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Agentes Legales de IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agents.map((agent) => (
                  <div key={agent.id} className="border rounded-lg p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg">{agent.name}</h4>
                          <Badge variant={
                            agent.status === 'active' ? 'default' : 
                            agent.status === 'pending_review' ? 'destructive' : 
                            agent.status === 'approved' ? 'default' :
                            'secondary'
                          }>
                            {agent.status === 'pending_review' ? 'Pendiente Revisión' :
                             agent.status === 'active' ? 'Activo' :
                             agent.status === 'approved' ? 'Aprobado' :
                             agent.status === 'suspended' ? 'Suspendido' :
                             agent.status}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{agent.description}</p>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{agent.category}</Badge>
                          <Badge variant="outline">{agent.target_audience}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {agent.price === 0 ? (
                              <span className="text-green-600 font-medium">GRATIS</span>
                            ) : (
                              <>Precio: ${agent.price?.toLocaleString()} COP</>
                            )}
                          </span>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          Creado: {format(new Date(agent.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedAgent(agent);
                            setShowAgentDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver Detalles
                        </Button>
                        
                         <Button 
                           size="sm" 
                           variant="outline"
                           onClick={(e) => {
                             console.log('🔧 Edit button clicked for agent:', agent.name);
                             console.log('🔧 Agent data:', agent);
                             e.preventDefault();
                             e.stopPropagation();
                             setEditingAgent({ ...agent });
                             setIsEditDialogOpen(true);
                             console.log('🔧 Edit dialog should be opening...');
                           }}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>

                        {/* Botón para recrear agente OpenAI */}
                        {(agent as any).openai_enabled && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm"
                                variant="outline" 
                                disabled={isRecreatingAgent}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                🔄 Recrear OpenAI
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Recrear Agente de OpenAI
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción recreará el agente de OpenAI para "<strong>{agent.name}</strong>" con las instrucciones actualizadas de la base de datos.
                                  <ul className="list-disc list-inside mt-3 space-y-1 text-sm">
                                    <li>Se eliminará el asistente actual de OpenAI</li>
                                    <li>Se creará un nuevo asistente con instrucciones actualizadas</li>
                                    <li>Se actualizarán los bloques de conversación</li>
                                    <li>Se configurarán las herramientas y funciones</li>
                                  </ul>
                                  <p className="mt-3 font-semibold text-orange-600">
                                    ⚠️ Esta operación puede tardar varios segundos.
                                  </p>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRecreateOpenAIAgent(agent.id, agent.name)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  Recrear Agente
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {agent.status === 'pending_review' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleUpdateAgentStatus(agent.id, 'approved')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Aprobar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleUpdateAgentStatus(agent.id, 'suspended')}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Rechazar
                            </Button>
                          </>
                        )}
                        
                        {agent.status === 'approved' && (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => handleUpdateAgentStatus(agent.id, 'active')}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Activar
                          </Button>
                        )}
                        
                        {(agent.status === 'active' || agent.status === 'approved') && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateAgentStatus(agent.id, 'suspended')}
                          >
                            <Lock className="w-4 h-4 mr-1" />
                            Suspender
                          </Button>
                         )}
                         
                         {agent.status === 'suspended' && (
                           <Button 
                             size="sm" 
                             variant="default"
                             onClick={() => {
                               console.log('🔧 Reactivate button clicked for agent:', agent.id);
                               handleUpdateAgentStatus(agent.id, 'active');
                             }}
                             className="bg-green-600 hover:bg-green-700"
                           >
                             <Play className="w-4 h-4 mr-1" />
                             Reactivar
                           </Button>
                         )}
                         
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Eliminar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente el agente "{agent.name}" y no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteAgent(agent)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
                
                {agents.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-lg font-medium">No hay agentes legales</p>
                    <p className="text-sm">Los agentes creados por los abogados aparecerán aquí</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
        
      case 'openai':
        return <OpenAIAgentManager />;
        
      case 'blogs':
        return <AdminBlogManager onBack={() => setCurrentView('dashboard')} authHeaders={getAuthHeaders()} />;
        
      case 'config':
        return <SystemConfigManager />;
        
      case 'email-config':
        return <EmailConfigManager />;
        
      case 'messages':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Consultas de Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contactMessages.map((message) => (
                  <div key={message.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{message.name}</h4>
                          <Badge variant={message.is_read ? 'default' : 'destructive'}>
                            {message.is_read ? 'Leído' : 'Sin leer'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{message.email}</p>
                        <p className="text-sm mt-2">{message.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(message.created_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Reply className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Archive className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
        
      case 'knowledge':
        return <KnowledgeBaseManager />;
        
      case 'categories':
        return <CategoryManager />;
        
      case 'subscriptions':
        return <SubscriptionAdminManager authHeaders={getAuthHeaders()} />;
        
      default:
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Selecciona una opción del menú lateral</p>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <AdminSidebar />
        
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="lg:hidden" />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    {currentSection?.label || 'Dashboard'}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentView === 'dashboard' ? 'Vista general del sistema jurídico' :
                     currentView === 'lawyers' ? 'Gestiona abogados registrados en el sistema' :
                     currentView === 'requests' ? 'Revisa solicitudes de acceso pendientes' :
                     currentView === 'agents' ? 'Administra agentes legales de IA' :
                     currentView === 'openai' ? 'Configuración de OpenAI y modelos' :
                     currentView === 'blogs' ? 'Gestiona contenido del blog jurídico' :
                     currentView === 'messages' ? 'Responde consultas de usuarios' :
                     currentView === 'knowledge' ? 'Administra la base de conocimiento' :
                     currentView === 'stats' ? 'Visualiza estadísticas del sistema' :
                     currentView === 'categories' ? 'Configura categorías de documentos' :
                     currentView === 'subscriptions' ? 'Administra planes y suscripciones de dLocal' :
                     currentView === 'email-config' ? 'Configura el sistema de notificaciones por email' :
                     currentView === 'config' ? 'Configuración avanzada del sistema' :
                     'Gestiona el portal administrativo'}
                  </p>
                </div>
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
                      {(unreadMessagesCount > 0 || pendingAgentsCount > 0) && (
                        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center">
                          {unreadMessagesCount + pendingAgentsCount}
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
                      
                      
                      {unreadMessagesCount === 0 && pendingAgentsCount === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                          <p className="text-sm">Todo al día</p>
                          <p className="text-xs">No hay notificaciones pendientes</p>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Botón para limpiar memoria de agentes */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Limpiar Memoria</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-orange-500" />
                        Limpiar Memoria de Agentes
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará toda la memoria almacenada de los agentes de chat, incluyendo:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Conversaciones activas</li>
                          <li>Thread IDs de OpenAI</li>
                          <li>Sesiones de chat</li>
                          <li>Términos aceptados</li>
                        </ul>
                        <p className="mt-3 font-semibold">La página se recargará después de limpiar la memoria.</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => {
                          AuthStorage.clearAllAgentMemory();
                          sonnerToast.success("✅ Memoria de agentes limpiada correctamente");
                          setTimeout(() => window.location.reload(), 1000);
                        }}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        Limpiar Memoria
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

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

            {/* Contenido dinámico */}
            {renderCurrentView()}
          </div>
        </main>
      </div>

      {/* Permissions Dialog */}
      <LawyerPermissionsDialog
        lawyer={selectedLawyerForPermissions}
        open={permissionsDialogOpen}
        onClose={() => {
          setPermissionsDialogOpen(false);
          setSelectedLawyerForPermissions(null);
        }}
        onPermissionsUpdated={loadLawyers}
        authHeaders={getAuthHeaders()}
      />

      {/* Diálogo de ver detalles del agente */}
      <Dialog open={showAgentDetails} onOpenChange={setShowAgentDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAgent?.name}</DialogTitle>
            <DialogDescription>
              Detalles completos del agente legal
            </DialogDescription>
          </DialogHeader>
          
          {selectedAgent && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Descripción</h4>
                <p className="text-sm text-muted-foreground">{selectedAgent.description}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Plantilla del Documento</h4>
                <div className="p-4 bg-muted rounded-md text-xs font-mono max-h-40 overflow-y-auto">
                  {selectedAgent.template_content}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Prompt de IA</h4>
                <div className="p-4 bg-muted rounded-md text-xs font-mono max-h-40 overflow-y-auto">
                  {selectedAgent.ai_prompt}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Guía de Conversación</h4>
                {isConvLoading ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Cargando guía...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium mb-2">Bloques</h5>
                      {convBlocks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay bloques configurados.</p>
                      ) : (
                        <div className="space-y-3">
                          {convBlocks.sort((a, b) => a.block_order - b.block_order).map((b) => (
                            <div key={b.id} className="p-3 border rounded-md">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{b.block_order}. {b.block_name}</div>
                                <Badge variant="outline">Placeholders: {Array.isArray(b.placeholders) ? b.placeholders.length : 0}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{b.intro_phrase}</p>
                              {Array.isArray(b.placeholders) && b.placeholders.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs font-medium mb-1">Campos:</div>
                                  <ul className="list-disc pl-5 text-xs space-y-0.5">
                                    {b.placeholders.map((ph: any, idx: number) => (
                                      <li key={idx}>
                                        <span className="font-medium">{ph.fieldName || ph.field_name || ph.name}</span>
                                        {(ph.helpText || ph.help_text) && (
                                          <span className="text-muted-foreground"> — {ph.helpText || ph.help_text}</span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div>
                      <h5 className="text-sm font-medium mb-2">Instrucciones por Campo</h5>
                      {fieldInstructions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay instrucciones específicas.</p>
                      ) : (
                        <div className="space-y-2">
                          {fieldInstructions.map((fi) => (
                            <div key={fi.field_name} className="p-3 border rounded-md">
                              <div className="font-medium text-sm">{fi.field_name}</div>
                              {fi.help_text && <p className="text-xs text-muted-foreground mt-1">{fi.help_text}</p>}
                              {fi.validation_rule && (
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Regla: {fi.validation_rule}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Información General</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Categoría:</strong> {selectedAgent.category}</div>
                    <div><strong>Precio:</strong> {selectedAgent.price === 0 ? 'GRATIS' : `$${selectedAgent.price?.toLocaleString()} COP`}</div>
                    <div><strong>Estado:</strong> {selectedAgent.status}</div>
                    <div><strong>Creado:</strong> {new Date(selectedAgent.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de edición de agente */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        console.log('🔧 Dialog state change:', open);
        setIsEditDialogOpen(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Agente Legal</DialogTitle>
            <DialogDescription>
              Modifica la información del agente legal
            </DialogDescription>
          </DialogHeader>
          
          {editingAgent && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre del Agente</Label>
                  <Input
                    id="name"
                    value={editingAgent.name}
                    onChange={(e) => handleEditFieldChange('name', e.target.value)}
                    placeholder="Nombre del agente"
                  />
                </div>
                
                <div>
                  <Label htmlFor="document_name">Nombre del Documento</Label>
                  <Input
                    id="document_name"
                    value={editingAgent.document_name || ''}
                    onChange={(e) => handleEditFieldChange('document_name', e.target.value)}
                    placeholder="Nombre del documento"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={editingAgent.description}
                  onChange={(e) => handleEditFieldChange('description', e.target.value)}
                  placeholder="Descripción del agente"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="document_description">Descripción del Documento</Label>
                <Textarea
                  id="document_description"
                  value={editingAgent.document_description || ''}
                  onChange={(e) => handleEditFieldChange('document_description', e.target.value)}
                  placeholder="Descripción del documento"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Select
                    value={editingAgent.category}
                    onValueChange={(value) => handleEditFieldChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="target_audience">Audiencia Objetivo</Label>
                  <Select
                    value={editingAgent.target_audience || 'personas'}
                    onValueChange={(value) => handleEditFieldChange('target_audience', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona audiencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personas">Personas</SelectItem>
                      <SelectItem value="empresas">Empresas</SelectItem>
                      <SelectItem value="ambos">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="price">Precio (COP)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={editingAgent.price || 0}
                    onChange={(e) => handleEditFieldChange('price', parseInt(e.target.value) || 0)}
                    placeholder="Precio (0 = gratis)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ingresa 0 para hacer el documento gratuito
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="price_justification">Justificación del Precio</Label>
                <Textarea
                  id="price_justification"
                  value={editingAgent.price_justification || ''}
                  onChange={(e) => handleEditFieldChange('price_justification', e.target.value)}
                  placeholder="Justificación del precio"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="template_content">Contenido de la Plantilla</Label>
                <Textarea
                  id="template_content"
                  value={editingAgent.template_content}
                  onChange={(e) => handleEditFieldChange('template_content', e.target.value)}
                  placeholder="Contenido de la plantilla del documento"
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="ai_prompt">Prompt de IA</Label>
                <Textarea
                  id="ai_prompt"
                  value={editingAgent.ai_prompt}
                  onChange={(e) => handleEditFieldChange('ai_prompt', e.target.value)}
                  placeholder="Prompt para la IA"
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button 
                  onClick={() => {
                    console.log('🔧 Save agent button clicked');
                    console.log('🔧 Current editing agent:', editingAgent);
                    handleSaveAgent();
                  }}
                  className="flex-1 sm:flex-none"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
                
                {editingAgent.status === 'pending_review' && (
                  <Button 
                    onClick={async () => {
                      await handleUpdateAgentStatus(editingAgent.id, 'active');
                      setIsEditDialogOpen(false);
                    }}
                    className="flex-1 sm:flex-none bg-success hover:bg-success/90"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprobar y Activar
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1 sm:flex-none"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

export default AdminPage;