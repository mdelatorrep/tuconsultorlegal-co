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

import { EmailConfigManager } from "./admin/EmailConfigManager";
import { LegalContentManager } from "./admin/LegalContentManager";
import { AdminDashboard } from "./admin/AdminDashboard";
import { AdminSidebar } from "./admin/AdminSidebar";
import { AdminHeader } from "./admin/AdminHeader";
import { DocumentsManager } from "./admin/DocumentsManager";
import { UsersManager } from "./admin/UsersManager";
import { SystemMonitoring } from "./admin/SystemMonitoring";
import { SystemLogsViewer } from "./admin/SystemLogsViewer";
import { RevenueAnalytics } from "./admin/RevenueAnalytics";
import { CreditsAdminManager } from "./admin/CreditsAdminManager";
import { BusinessMetricsDashboard } from "./admin/BusinessMetricsDashboard";
import { AIToolsAnalytics } from "./admin/AIToolsAnalytics";
import { RetentionDashboard } from "./admin/RetentionDashboard";
import { ProcessMonitorAdmin } from "./admin/ProcessMonitorAdmin";
import { LeadsAnalytics } from "./admin/LeadsAnalytics";
import { StrategicDecisions } from "./admin/StrategicDecisions";
import LawyerVerificationAdmin from "./admin/LawyerVerificationAdmin";
import { AdminSpecializedAgents } from "./admin/AdminSpecializedAgents";
import {
  Copy, Users, Bot, BarChart3, Clock, CheckCircle, Lock, Unlock, Trash2, Check, X, Plus, RefreshCw, 
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
import { SidebarProvider } from "./ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import LawyerPermissionsDialog from './LawyerPermissionsDialog';
import { AdminCustomDocumentRequests } from './AdminCustomDocumentRequests';
import RichTextTemplateEditor from "./RichTextTemplateEditor";
import DocumentPDFPreview from "./DocumentPDFPreview";
import { sanitizeHtml } from "@/utils/htmlSanitizer";
import OpenAIAgentDebug from "./OpenAIAgentDebug";

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
  sla_enabled?: boolean;
  sla_hours?: number;
  openai_enabled?: boolean;
  placeholder_fields?: any[];
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
  
  // Estado para responder mensajes
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedMessageForReply, setSelectedMessageForReply] = useState<ContactMessage | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

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
      console.log('🔄 Loading lawyers from server...');
      const { data, error } = await supabase.functions.invoke('get-lawyers-admin', {
        headers: getAuthHeaders()
      });
      if (error) {
        console.error('❌ Error loading lawyers:', error);
        throw error;
      }
      console.log(`✅ Loaded ${data?.length || 0} lawyers:`, data);
      setLawyers(data || []);
    } catch (error) {
      console.error('Error loading lawyers:', error);
      toast({
        title: "Error",
        description: "Error al cargar la lista de abogados. Por favor, recarga la página.",
        variant: "destructive"
      });
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

      const bodyPayload: Record<string, any> = {
        agent_id: agentId,
        status: newStatus,
        user_id: user?.id || 'admin_override',
        is_admin: true,
        document_name: agent.name, // Copiar el nombre del agente al nombre del documento
        // Preservar precio al aprobar/activar para evitar que se resetee
        price: agent.price || 0
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

  const handleOpenReplyDialog = (message: ContactMessage) => {
    setSelectedMessageForReply(message);
    setReplyContent('');
    setReplyDialogOpen(true);
  };

  const handleSendReply = async () => {
    if (!selectedMessageForReply || !replyContent.trim()) {
      toast({
        title: "Error",
        description: "Por favor escribe una respuesta",
        variant: "destructive",
      });
      return;
    }

    setIsSendingReply(true);
    try {
      // Enviar email de respuesta
      const { data, error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: selectedMessageForReply.email,
          subject: `Re: Consulta desde Tu Consultor Legal`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0372E8, #0056b3); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Tu Consultor Legal</h1>
              </div>
              <div style="padding: 30px; background: #f9f9f9;">
                <p style="color: #333;">Hola <strong>${selectedMessageForReply.name}</strong>,</p>
                <p style="color: #333;">Gracias por contactarnos. A continuación nuestra respuesta:</p>
                <div style="background: white; padding: 20px; border-left: 4px solid #0372E8; margin: 20px 0;">
                  ${replyContent.replace(/\n/g, '<br>')}
                </div>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">Tu mensaje original:</p>
                <p style="color: #999; font-size: 12px; font-style: italic;">${selectedMessageForReply.message}</p>
              </div>
              <div style="background: #333; padding: 20px; text-align: center;">
                <p style="color: #999; margin: 0; font-size: 12px;">
                  © ${new Date().getFullYear()} Praxis Hub | www.praxis-hub.co
                </p>
              </div>
            </div>
          `,
          template_key: 'admin_reply',
          recipient_type: 'user'
        }
      });

      if (emailError) throw emailError;

      // Actualizar el mensaje como respondido
      const { error: updateError } = await supabase
        .from('contact_messages')
        .update({ 
          is_read: true, 
          status: 'responded', 
          responded_at: new Date().toISOString(),
          admin_notes: replyContent
        })
        .eq('id', selectedMessageForReply.id);

      if (updateError) throw updateError;

      toast({
        title: "Respuesta enviada",
        description: `Se ha enviado la respuesta a ${selectedMessageForReply.email}`,
      });

      setReplyDialogOpen(false);
      setSelectedMessageForReply(null);
      setReplyContent('');
      await loadContactMessages();
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la respuesta",
        variant: "destructive",
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleArchiveMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status: 'archived', is_read: true })
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: "Mensaje archivado",
        description: "El mensaje ha sido archivado correctamente",
      });

      await loadContactMessages();
    } catch (error) {
      console.error('Error archiving message:', error);
      toast({
        title: "Error",
        description: "No se pudo archivar el mensaje",
        variant: "destructive",
      });
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
        { id: 'legal-content', label: 'Contenido Legal', icon: FileText, count: 0 },
        { id: 'messages', label: 'Consultas de Usuarios', icon: MessageCircle, count: unreadMessagesCount },
        { id: 'custom-requests', label: 'Solicitudes Personalizadas', icon: FileCheck, count: 0 },
      ]
    },
    {
      label: "Sistema & Configuración",
      items: [
        { id: 'knowledge', label: 'Base de Conocimiento', icon: Database, count: 0 },
        { id: 'categories', label: 'Categorías', icon: Tag, count: 0 },
        
        { id: 'email-config', label: 'Configuración Email', icon: Mail, count: 0 },
        { id: 'stats', label: 'Estadísticas Avanzadas', icon: BarChart3, count: 0 },
        { id: 'config', label: 'Configuración Sistema', icon: Settings, count: 0 },
      ]
    }
  ];

  const currentSection = sidebarSections.flatMap(s => s.items).find(item => item.id === currentView);

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
        return <BusinessMetricsDashboard />;
      
      case 'revenue':
        return <RevenueAnalytics />;
      
      case 'retention':
        return <RetentionDashboard onNavigate={setCurrentView} />;
      
      case 'strategic':
        return <StrategicDecisions onNavigate={setCurrentView} />;
      
      case 'verifications':
        return <LawyerVerificationAdmin adminId={user?.id || ''} />;
      
      case 'leads':
        return <LeadsAnalytics />;
      
      case 'ai-tools':
        return <AIToolsAnalytics />;
      
      case 'processes':
        return <ProcessMonitorAdmin />;
      
      case 'lawyers':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Gestión de Abogados Colombianos
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadLawyers}
                  title="Actualizar lista de abogados"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar
                </Button>
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
                        <div className="flex items-center gap-2 flex-wrap">
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
                          {agent.openai_enabled && (
                            <Badge variant="outline" className="text-blue-600 border-blue-300">
                              <Bot className="w-3 h-3 mr-1" />
                              OpenAI
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{agent.description}</p>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{agent.category}</Badge>
                          <Badge variant="outline" className={
                            agent.target_audience === 'personas' ? 'border-purple-300 text-purple-600' :
                            agent.target_audience === 'empresas' ? 'border-blue-300 text-blue-600' :
                            'border-green-300 text-green-600'
                          }>
                            {agent.target_audience === 'personas' ? '👤 Personas' :
                             agent.target_audience === 'empresas' ? '🏢 Empresas' :
                             '🌐 Ambos'}
                          </Badge>
                          {agent.sla_enabled && agent.sla_hours && (
                            <Badge variant="outline" className="border-amber-300 text-amber-600">
                              <Clock className="w-3 h-3 mr-1" />
                              ANS {agent.sla_hours}h
                            </Badge>
                          )}
                          {convBlocks.length > 0 && selectedAgent?.id === agent.id && (
                            <Badge variant="outline" className="border-emerald-300 text-emerald-600">
                              <MessageCircle className="w-3 h-3 mr-1" />
                              {convBlocks.length} bloques
                            </Badge>
                          )}
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
        
      case 'legal-content':
        return <LegalContentManager />;
        
      case 'config':
        return <SystemConfigManager />;
        
      case 'specialized-agents':
        return <AdminSpecializedAgents />;
        
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
                {contactMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No hay consultas de usuarios</p>
                  </div>
                ) : (
                  contactMessages.map((message) => (
                    <div key={message.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium">{message.name}</h4>
                            <Badge variant={message.is_read ? 'default' : 'destructive'}>
                              {message.is_read ? 'Leído' : 'Sin leer'}
                            </Badge>
                            {message.status === 'responded' && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Respondido
                              </Badge>
                            )}
                            {message.status === 'archived' && (
                              <Badge variant="secondary">Archivado</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{message.email}</p>
                          {message.phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {message.phone}
                            </p>
                          )}
                          <p className="text-sm mt-2">{message.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(message.created_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {message.status !== 'responded' && message.status !== 'archived' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleOpenReplyDialog(message)}
                              title="Responder mensaje"
                            >
                              <Reply className="w-4 h-4" />
                            </Button>
                          )}
                          {message.status !== 'archived' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleArchiveMessage(message.id)}
                              title="Archivar mensaje"
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        );
        
      case 'knowledge':
        return <KnowledgeBaseManager />;
        
      case 'categories':
        return <CategoryManager />;
        
        
      case 'custom-requests':
        return <AdminCustomDocumentRequests />;
      
      case 'documents':
        return <DocumentsManager />;
      
      case 'users':
        return <UsersManager />;
      
      case 'monitoring':
        return <SystemMonitoring />;
      
      case 'logs':
        return <SystemLogsViewer />;
      
      case 'revenue':
        return <RevenueAnalytics />;
      
      case 'credits':
        return <CreditsAdminManager authHeaders={getAuthHeaders()} />;
        
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
      <div className="flex min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <AdminSidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          unreadMessagesCount={unreadMessagesCount}
          pendingAgentsCount={pendingAgentsCount}
          pendingBlogsCount={pendingBlogsCount}
          userEmail={user?.email}
        />
        
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <AdminHeader
              currentView={currentView}
              currentSection={currentSection}
              unreadMessagesCount={unreadMessagesCount}
              pendingAgentsCount={pendingAgentsCount}
              onLogout={logout}
              onClearMemory={async () => {
                try {
                  sonnerToast.loading("Limpiando memoria global...");
                  AuthStorage.clearAllAgentMemory();
                  
                  const { data, error } = await supabase.functions.invoke('clear-agent-conversations', {
                    body: { agentId: null }
                  });
                  
                  if (error) throw error;
                  sonnerToast.success(`✅ ${data.message}`);
                  setTimeout(() => window.location.reload(), 1500);
                } catch (error: any) {
                  console.error('Error clearing memory:', error);
                  sonnerToast.error("❌ Error al limpiar la memoria: " + error.message);
                }
              }}
              onRefresh={loadData}
            />

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

      {/* Diálogo de ver detalles del agente con Tabs */}
      <Dialog open={showAgentDetails} onOpenChange={setShowAgentDetails}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              {selectedAgent?.name}
            </DialogTitle>
            <DialogDescription>
              Detalles completos del servicio legal
            </DialogDescription>
          </DialogHeader>
          
          {selectedAgent && (
            <Tabs defaultValue="summary" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary">📊 Resumen</TabsTrigger>
                <TabsTrigger value="template">📄 Plantilla</TabsTrigger>
                <TabsTrigger value="conversation">💬 Conversación</TabsTrigger>
                <TabsTrigger value="openai">🤖 OpenAI</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4">
                {/* TAB 1: RESUMEN */}
                <TabsContent value="summary" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Información General
                        </h4>
                        <div className="space-y-2 text-sm bg-muted/50 p-4 rounded-lg">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Categoría:</span>
                            <Badge variant="outline">{selectedAgent.category}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Audiencia:</span>
                            <Badge variant="outline" className={
                              selectedAgent.target_audience === 'personas' ? 'border-purple-300 text-purple-600' :
                              selectedAgent.target_audience === 'empresas' ? 'border-blue-300 text-blue-600' :
                              'border-green-300 text-green-600'
                            }>
                              {selectedAgent.target_audience === 'personas' ? '👤 Personas' :
                               selectedAgent.target_audience === 'empresas' ? '🏢 Empresas' :
                               '🌐 Ambos'}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Precio:</span>
                            <span className={selectedAgent.price === 0 ? 'text-green-600 font-medium' : ''}>
                              {selectedAgent.price === 0 ? 'GRATIS' : `$${selectedAgent.price?.toLocaleString()} COP`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Estado:</span>
                            <Badge variant={
                              selectedAgent.status === 'active' ? 'default' : 
                              selectedAgent.status === 'pending_review' ? 'destructive' : 
                              'secondary'
                            }>
                              {selectedAgent.status === 'pending_review' ? 'Pendiente' :
                               selectedAgent.status === 'active' ? 'Activo' :
                               selectedAgent.status === 'approved' ? 'Aprobado' :
                               selectedAgent.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Creado:</span>
                            <span>{format(new Date(selectedAgent.created_at), 'dd/MM/yyyy', { locale: es })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Configuración ANS */}
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Clock className="w-4 h-4" /> Configuración ANS
                        </h4>
                        <div className="bg-muted/50 p-4 rounded-lg">
                          {(selectedAgent as any).sla_enabled ? (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                                <Timer className="w-3 h-3 mr-1" />
                                {(selectedAgent as any).sla_hours}h para revisión
                              </Badge>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">ANS no habilitado</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Descripción</h4>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                          {selectedAgent.description}
                        </p>
                      </div>

                      {/* Variables del documento */}
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Tag className="w-4 h-4" /> Variables del Documento
                        </h4>
                        <div className="bg-muted/50 p-4 rounded-lg max-h-40 overflow-y-auto">
                          {(selectedAgent as any).placeholder_fields && Array.isArray((selectedAgent as any).placeholder_fields) && (selectedAgent as any).placeholder_fields.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {(selectedAgent as any).placeholder_fields.map((field: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {typeof field === 'string' ? field : field.placeholder || field.name || 'Campo'}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Sin variables definidas</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: PLANTILLA */}
                <TabsContent value="template" className="space-y-4 mt-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Contenido de la Plantilla
                    </h4>
                    <DocumentPDFPreview
                      templateContent={selectedAgent.template_content || ''}
                      documentName={selectedAgent.name}
                      placeholders={(selectedAgent as any).placeholder_fields}
                      buttonVariant="outline"
                      buttonSize="sm"
                    />
                  </div>
                  <div 
                    className="p-6 bg-white dark:bg-gray-900 border rounded-lg max-h-[400px] overflow-y-auto prose prose-sm max-w-none"
                    style={{ fontFamily: 'Times New Roman, serif', lineHeight: 1.7 }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedAgent.template_content || '') }}
                  />
                </TabsContent>

                {/* TAB 3: CONVERSACIÓN */}
                <TabsContent value="conversation" className="space-y-6 mt-0">
                  {isConvLoading ? (
                    <div className="text-sm text-muted-foreground flex items-center gap-2 justify-center py-8">
                      <Loader2 className="w-4 h-4 animate-spin" /> Cargando guía de conversación...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" /> Bloques de Conversación
                        </h4>
                        {convBlocks.length === 0 ? (
                          <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                            No hay bloques configurados.
                          </p>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {convBlocks.sort((a, b) => a.block_order - b.block_order).map((b) => (
                              <div key={b.id} className="p-4 border rounded-lg bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-medium text-sm">{b.block_order}. {b.block_name}</div>
                                  <Badge variant="outline" className="text-xs">
                                    {Array.isArray(b.placeholders) ? b.placeholders.length : 0} campos
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground italic">"{b.intro_phrase}"</p>
                                {Array.isArray(b.placeholders) && b.placeholders.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {b.placeholders.map((ph: any, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {ph.fieldName || ph.field_name || ph.name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <HelpCircle className="w-4 h-4" /> Instrucciones por Campo
                        </h4>
                        {fieldInstructions.length === 0 ? (
                          <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                            No hay instrucciones específicas.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {fieldInstructions.map((fi) => (
                              <div key={fi.field_name} className="p-3 border rounded-lg">
                                <div className="font-medium text-sm">{fi.field_name}</div>
                                {fi.help_text && (
                                  <p className="text-xs text-muted-foreground mt-1">{fi.help_text}</p>
                                )}
                                {fi.validation_rule && (
                                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                    Regla: {fi.validation_rule}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* TAB 4: OPENAI */}
                <TabsContent value="openai" className="space-y-6 mt-0">
                  <OpenAIAgentDebug legalAgentId={selectedAgent.id} />
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Prompt de IA
                    </h4>
                    <div className="p-4 bg-muted rounded-lg text-xs font-mono max-h-60 overflow-y-auto whitespace-pre-wrap">
                      {selectedAgent.ai_prompt || 'Sin prompt configurado'}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de edición de agente con Tabs */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        console.log('🔧 Dialog state change:', open);
        setIsEditDialogOpen(open);
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Editar Servicio Legal
            </DialogTitle>
            <DialogDescription>
              Modifica la información del servicio legal
            </DialogDescription>
          </DialogHeader>
          
          {editingAgent && (
            <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">📊 Información</TabsTrigger>
                <TabsTrigger value="template">📄 Plantilla</TabsTrigger>
                <TabsTrigger value="config">⚙️ Configuración</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4">
                {/* TAB 1: INFORMACIÓN */}
                <TabsContent value="info" className="space-y-4 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nombre del Servicio</Label>
                      <Input
                        id="name"
                        value={editingAgent.name}
                        onChange={(e) => handleEditFieldChange('name', e.target.value)}
                        placeholder="Nombre del servicio"
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
                      placeholder="Descripción del servicio"
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
                          <SelectItem value="personas">👤 Personas</SelectItem>
                          <SelectItem value="empresas">🏢 Empresas</SelectItem>
                          <SelectItem value="ambos">🌐 Ambos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div>
                      <Label htmlFor="price_justification">Justificación del Precio</Label>
                      <Textarea
                        id="price_justification"
                        value={editingAgent.price_justification || ''}
                        onChange={(e) => handleEditFieldChange('price_justification', e.target.value)}
                        placeholder="Justificación del precio"
                        rows={2}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: PLANTILLA */}
                <TabsContent value="template" className="space-y-4 mt-0">
                  <div className="flex items-center justify-between">
                    <Label>Contenido de la Plantilla</Label>
                    <DocumentPDFPreview
                      templateContent={editingAgent.template_content || ''}
                      documentName={editingAgent.name}
                      placeholders={editingAgent.placeholder_fields}
                      buttonVariant="outline"
                      buttonSize="sm"
                    />
                  </div>
                  <RichTextTemplateEditor
                    value={editingAgent.template_content || ''}
                    onChange={(value) => handleEditFieldChange('template_content', value)}
                    placeholder="Contenido de la plantilla del documento"
                    minHeight="400px"
                    placeholders={editingAgent.placeholder_fields}
                  />
                  
                  <Separator className="my-4" />
                  
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
                </TabsContent>

                {/* TAB 3: CONFIGURACIÓN */}
                <TabsContent value="config" className="space-y-6 mt-0">
                  {/* Configuración ANS */}
                  <div className="p-4 border rounded-lg bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Configuración ANS (Acuerdo de Nivel de Servicio)
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Habilitar ANS</Label>
                          <p className="text-xs text-muted-foreground">
                            El documento deberá ser revisado dentro del tiempo especificado
                          </p>
                        </div>
                        <Switch
                          checked={editingAgent.sla_enabled || false}
                          onCheckedChange={(checked) => handleEditFieldChange('sla_enabled', checked)}
                        />
                      </div>
                      {editingAgent.sla_enabled && (
                        <div>
                          <Label htmlFor="sla_hours">Horas para revisión</Label>
                          <Input
                            id="sla_hours"
                            type="number"
                            min="1"
                            max="168"
                            value={editingAgent.sla_hours || 24}
                            onChange={(e) => handleEditFieldChange('sla_hours', parseInt(e.target.value) || 24)}
                            className="w-32"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Configuración Visual */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <Settings className="w-4 h-4" /> Configuración Visual
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="button_cta">Texto del Botón (CTA)</Label>
                        <Input
                          id="button_cta"
                          value={editingAgent.button_cta || ''}
                          onChange={(e) => handleEditFieldChange('button_cta', e.target.value)}
                          placeholder="Ej: Crear Contrato"
                        />
                      </div>
                      <div>
                        <Label htmlFor="frontend_icon">Icono (nombre Lucide)</Label>
                        <Input
                          id="frontend_icon"
                          value={editingAgent.frontend_icon || ''}
                          onChange={(e) => handleEditFieldChange('frontend_icon', e.target.value)}
                          placeholder="Ej: FileText, Scale, Briefcase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Estado del Servicio
                    </h4>
                    <Select
                      value={editingAgent.status}
                      onValueChange={(value) => handleEditFieldChange('status', value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Selecciona estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending_review">🟡 Pendiente Revisión</SelectItem>
                        <SelectItem value="approved">🟢 Aprobado</SelectItem>
                        <SelectItem value="active">✅ Activo</SelectItem>
                        <SelectItem value="suspended">🔴 Suspendido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t mt-4">
                <Button 
                  onClick={() => {
                    console.log('🔧 Save agent button clicked');
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
                    className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
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
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de responder mensaje */}
      <Dialog open={replyDialogOpen} onOpenChange={(open) => {
        setReplyDialogOpen(open);
        if (!open) {
          setSelectedMessageForReply(null);
          setReplyContent('');
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Reply className="w-5 h-5" />
              Responder Consulta
            </DialogTitle>
            <DialogDescription>
              Escribe tu respuesta para {selectedMessageForReply?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedMessageForReply && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{selectedMessageForReply.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedMessageForReply.email}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selectedMessageForReply.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
                <p className="text-sm">{selectedMessageForReply.message}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reply-content">Tu respuesta</Label>
                <Textarea
                  id="reply-content"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Escribe tu respuesta aquí..."
                  className="min-h-[150px]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setReplyDialogOpen(false)}
                  disabled={isSendingReply}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSendReply}
                  disabled={isSendingReply || !replyContent.trim()}
                >
                  {isSendingReply ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Respuesta
                    </>
                  )}
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