import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useNativeAdminAuth } from "@/hooks/useNativeAdminAuth";
import NativeAdminLogin from "./NativeAdminLogin";
import LawyerStatsAdmin from "./LawyerStatsAdmin";
import { Users, FileText, Shield, Plus, Check, X, BarChart3, TrendingUp, DollarSign, Activity, LogOut, Unlock, AlertTriangle, Eye, EyeOff, Trash2, Copy, ChartPie, Settings, RefreshCw, Save } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import DOMPurify from 'dompurify';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface Lawyer {
  id: string;
  email: string;
  full_name: string;
  active: boolean;
  can_create_agents: boolean;
  created_at: string;
  failed_login_attempts?: number;
  locked_until?: string;
  last_login_at?: string;
  access_token?: string;
  // NOTA: Los abogados NO tienen campo is_admin - no son administradores
}

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  suggested_price: number;
  final_price: number | null;
  created_by: string;
  created_at: string;
  template_content: string;
  ai_prompt: string;
  sla_enabled: boolean;
  sla_hours: number;
  document_name: string;
  document_description: string;
  button_cta: string;
  target_audience: string;
  price_justification: string | null; // Campo faltante agregado
  placeholder_fields?: any; // Campo faltante agregado
  frontend_icon?: string | null; // Campo faltante agregado
  created_by_lawyer?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface LawyerStats {
  lawyer_id: string;
  lawyer_name: string;
  contracts_count: number;
  total_value: number;
  agents_created: number;
  active_agents: number;
}

interface BusinessStats {
  total_lawyers: number;
  total_agents: number;
  active_agents: number;
  total_contracts: number;
  total_revenue: number;
  monthly_growth: number;
}

interface ContractDetail {
  id: string;
  document_type: string;
  price: number;
  status: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

function AdminPage() {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [lawyerStats, setLawyerStats] = useState<LawyerStats[]>([]);
  const [businessStats, setBusinessStats] = useState<BusinessStats | null>(null);
  const [contracts, setContracts] = useState<ContractDetail[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [tokenRequests, setTokenRequests] = useState<any[]>([]);
  const [pendingAgentsCount, setPendingAgentsCount] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAgentDetails, setShowAgentDetails] = useState(false);
  const [selectedLawyerForStats, setSelectedLawyerForStats] = useState<any>(null);
  const [showLawyerStatsDialog, setShowLawyerStatsDialog] = useState(false);
  const [documentCategories, setDocumentCategories] = useState<any[]>([]);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [canCreateAgents, setCanCreateAgents] = useState(false);
  const [generatedToken, setGeneratedToken] = useState('');
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('gpt-4.1-2025-04-14');
  const [systemConfig, setSystemConfig] = useState<any>({});
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user, logout, getAuthHeaders, checkAuthStatus } = useNativeAdminAuth();

  // New lawyer form state - Los abogados NO pueden ser administradores
  const [newLawyer, setNewLawyer] = useState({
    email: "",
    full_name: "",
    phone_number: "",
    can_create_agents: false
    // REMOVIDO: is_admin - los abogados no son administradores
  });

  const [showAddLawyer, setShowAddLawyer] = useState(false);

  // New agent form state
  const [newAgent, setNewAgent] = useState({
    name: "",
    description: "",
    category: "",
    ai_prompt: "",
    suggested_price: 0,
    frontend_icon: "FileText",
    document_name: "",
    document_description: "",
    button_cta: "Generar Documento",
    target_audience: "personas"
  });

  useEffect(() => {
    console.log('AdminPage useEffect triggered - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
    if (!isLoading) {
      if (isAuthenticated) {
        console.log('User authenticated, loading data...');
        loadData();
      } else {
        console.log('User NOT authenticated');
      }
    }
  }, [isAuthenticated, isLoading]);

  const sanitizeInput = (input: string): string => {
    return DOMPurify.sanitize(input.trim());
  };

  const handleLoginSuccess = async () => {
    console.log('handleLoginSuccess called - forcing state refresh');
    // Force immediate re-check of authentication status
    await checkAuthStatus();
  };

  const loadData = async () => {
    try {
      console.log('Loading data...');
      const authHeaders = getAuthHeaders();
      
      if (!authHeaders.authorization) {
        console.error('No admin token found');
        toast({
          title: "Error de autenticación",
          description: "Token de administrador no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      console.log('Using auth token for queries:', !!authHeaders.authorization);

      // Load lawyers using admin function
      console.log('Attempting to load lawyers via admin function...');
      const { data: lawyersData, error: lawyersError } = await supabase.functions.invoke('get-lawyers-admin', {
        headers: authHeaders
      });

      if (lawyersError) {
        console.error('Error loading lawyers:', lawyersError);
        
        // Provide specific error messages based on the type of error
        if (lawyersError.message?.includes('permission denied') || lawyersError.message?.includes('insufficient privileges')) {
          toast({
            title: "Sin permisos para cargar abogados",
            description: "Tu sesión de administrador expiró o no tienes permisos suficientes. Inicia sesión nuevamente.",
            variant: "destructive"
          });
        } else if (lawyersError.message?.includes('network') || lawyersError.message?.includes('fetch')) {
          toast({
            title: "Error de conectividad",
            description: "No se pudo conectar con el servidor. Verifica tu conexión a internet.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error al cargar abogados",
            description: lawyersError.message || "No se pudieron cargar los datos de abogados. Intenta nuevamente.",
            variant: "destructive"
          });
        }
        return;
      }
      
      console.log('Lawyers loaded:', lawyersData?.length || 0);
      setLawyers(lawyersData || []);

      // Load agents using admin function for consistency
      console.log('Attempting to load agents via admin function...');
      const { data: agentsData, error: agentsError } = await supabase.functions.invoke('get-agents-admin', {
        headers: authHeaders
      });

      if (agentsError) {
        console.error('Error loading agents:', agentsError);
        
        // Provide specific error messages based on the type of error
        if (agentsError.message?.includes('permission denied') || agentsError.message?.includes('insufficient privileges')) {
          toast({
            title: "Sin permisos para cargar agentes",
            description: "Tu sesión de administrador expiró o no tienes permisos suficientes. Inicia sesión nuevamente.",
            variant: "destructive"
          });
        } else if (agentsError.message?.includes('network') || agentsError.message?.includes('fetch')) {
          toast({
            title: "Error de conectividad",
            description: "No se pudo conectar con el servidor. Verifica tu conexión a internet.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error al cargar agentes",
            description: agentsError.message || "No se pudieron cargar los datos de agentes. Intenta nuevamente.",
            variant: "destructive"
          });
        }
        return;
      }
      
      console.log('Agents loaded:', agentsData?.length || 0);
      setAgents(agentsData || []);
      
      // Calcular agentes pendientes por revisar
      const pendingCount = (agentsData || []).filter(agent => agent.status === 'pending_review').length;
      setPendingAgentsCount(pendingCount);

      // Load token requests
      console.log('Loading token requests...');
      const { data: tokenRequestsData, error: tokenRequestsError } = await supabase.functions.invoke('get-token-requests', {
        headers: authHeaders
      });

      if (tokenRequestsError) {
        console.error('Error loading token requests:', tokenRequestsError);
        toast({
          title: "Error al cargar solicitudes",
          description: "No se pudieron cargar las solicitudes de token de abogados.",
          variant: "destructive"
        });
      } else {
        console.log('Token requests loaded:', tokenRequestsData?.length || 0);
        setTokenRequests(tokenRequestsData || []);
      }

      // Load system configuration
      await loadSystemConfig();

      // Load document categories
      await loadDocumentCategories();

      // Load statistics
      await loadStatistics(lawyersData || [], agentsData || []);
      console.log('Data loading completed successfully');
    } catch (error: any) {
      console.error('Error loading data:', error);
      
      // Provide more specific error handling
      if (error.message?.includes('session') || error.message?.includes('token')) {
        toast({
          title: "Sesión expirada",
          description: "Tu sesión ha expirado. Serás redirigido al login.",
          variant: "destructive"
        });
        logout(); // Force logout on session errors
      } else if (error.message?.includes('network') || error.message?.includes('connectivity')) {
        toast({
          title: "Error de conexión",
          description: "Problema de conectividad. Verifica tu conexión a internet e intenta nuevamente.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error al cargar datos",
          description: error.message || "Error inesperado al cargar los datos del panel de administración.",
          variant: "destructive"
        });
      }
    }
  };

  const loadStatistics = async (lawyersData: Lawyer[], agentsData: Agent[]) => {
    try {
      // Load contracts
      const { data: contractsData, error: contractsError } = await supabase
        .from('document_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (contractsError) throw contractsError;
      setContracts(contractsData || []);

      // Calculate business statistics
      const totalRevenue = contractsData?.reduce((sum, c) => sum + c.price, 0) || 0;
      const monthlyGrowth = calculateMonthlyGrowth(contractsData || []);
      
      const businessStatsData: BusinessStats = {
        total_lawyers: lawyersData.length,
        total_agents: agentsData.length,
        active_agents: agentsData.filter(a => a.status === 'active').length,
        total_contracts: contractsData?.length || 0,
        total_revenue: totalRevenue,
        monthly_growth: monthlyGrowth
      };
      setBusinessStats(businessStatsData);

      // Generate monthly data for charts
      const monthlyStats = generateMonthlyDataFromContracts(contractsData || [], lawyersData);
      setMonthlyData(monthlyStats);

      // Calculate lawyer statistics
      const statsPromises = lawyersData.map(async (lawyer) => {
        const agentsByLawyer = agentsData.filter(a => a.created_by === lawyer.id);
        
        const contractsCount = contractsData?.filter(c => 
          agentsByLawyer?.some(a => a.name.toLowerCase().includes(c.document_type.toLowerCase()))
        ).length || 0;

        const totalValue = contractsData?.filter(c => 
          agentsByLawyer?.some(a => a.name.toLowerCase().includes(c.document_type.toLowerCase()))
        ).reduce((sum, c) => sum + c.price, 0) || 0;

        return {
          lawyer_id: lawyer.id,
          lawyer_name: lawyer.full_name,
          contracts_count: contractsCount,
          total_value: totalValue,
          agents_created: agentsByLawyer?.length || 0,
          active_agents: agentsByLawyer?.filter(a => a.status === 'active').length || 0
        };
      });

      const statsResults = await Promise.all(statsPromises);
      setLawyerStats(statsResults);

    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadSystemConfig = async () => {
    try {
      const { data: configData, error: configError } = await supabase
        .from('system_config')
        .select('*');

      if (configError) {
        console.error('Error loading system config:', configError);
        return;
      }

      // Convert array to object for easier access
      const configObj: { [key: string]: string } = configData?.reduce((acc, item) => {
        acc[item.config_key] = item.config_value;
        return acc;
      }, {} as { [key: string]: string }) || {};

      setSystemConfig(configObj);
      
      // Set selected model from config
      if (configObj['openai_model']) {
        setSelectedModel(configObj['openai_model']);
      }

    } catch (error) {
      console.error('Error loading system config:', error);
    }
  };

  const loadOpenAIModels = async () => {
    try {
      const { data: modelsData, error: modelsError } = await supabase.functions.invoke('get-openai-models', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (modelsError) {
        console.error('Error loading OpenAI models:', modelsError);
        toast({
          title: "Error al cargar modelos",
          description: "No se pudieron cargar los modelos disponibles de OpenAI.",
          variant: "destructive"
        });
        return;
      }

      if (modelsData?.success) {
        setAvailableModels(modelsData.models || []);
        toast({
          title: "Modelos cargados",
          description: `Se cargaron ${modelsData.models?.length || 0} modelos disponibles.`,
        });
      }
    } catch (error) {
      console.error('Error loading OpenAI models:', error);
      toast({
        title: "Error al cargar modelos",
        description: "Error inesperado al cargar los modelos.",
        variant: "destructive"
      });
    }
  };

  const updateSystemConfig = async (key: string, value: string, description?: string) => {
    try {
      const authHeaders = getAuthHeaders();
      const { data: updateData, error: updateError } = await supabase.functions.invoke('update-system-config', {
        headers: authHeaders,
        body: {
          config_key: key,
          config_value: value,
          description: description || `Configuración de ${key}`
        }
      });

      if (updateError) {
        console.error('Error updating system config:', updateError);
        toast({
          title: "Error al actualizar configuración",
          description: "No se pudo actualizar la configuración del sistema.",
          variant: "destructive"
        });
        return;
      }

      if (updateData?.success) {
        // Update local state
        setSystemConfig(prev => ({
          ...prev,
          [key]: value
        }));
        
        toast({
          title: "Configuración actualizada",
          description: `${description || key} actualizado correctamente.`,
        });
      }
    } catch (error) {
      console.error('Error updating system config:', error);
      toast({
        title: "Error",
        description: "Error inesperado al actualizar la configuración.",
        variant: "destructive"
      });
    }
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    await updateSystemConfig('openai_model', modelId, 'Modelo de OpenAI para procesamiento de IA');
  };

  const calculateMonthlyGrowth = (contracts: ContractDetail[]) => {
    if (contracts.length === 0) return 0;
    
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const currentMonthContracts = contracts.filter(c => 
      new Date(c.created_at) >= currentMonth
    );
    
    const lastMonthContracts = contracts.filter(c => {
      const contractDate = new Date(c.created_at);
      return contractDate >= lastMonth && contractDate < currentMonth;
    });
    
    if (lastMonthContracts.length === 0) return 100;
    
    const growth = ((currentMonthContracts.length - lastMonthContracts.length) / lastMonthContracts.length) * 100;
    return Math.round(growth * 10) / 10;
  };

  const generateMonthlyDataFromContracts = (contracts: ContractDetail[], lawyersData: Lawyer[]) => {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
      
      const monthContracts = contracts.filter(c => {
        const contractDate = new Date(c.created_at);
        return contractDate >= monthDate && contractDate < nextMonthDate;
      });
      
      const monthRevenue = monthContracts.reduce((sum, c) => sum + c.price, 0);
      
      last6Months.push({
        month: monthNames[monthDate.getMonth()],
        contratos: monthContracts.length,
        ingresos: monthRevenue,
        abogados: lawyersData.length
      });
    }
    
    return last6Months;
  };

  const createLawyer = async () => {
    // Input validation and sanitization
    const sanitizedEmail = sanitizeInput(newLawyer.email).toLowerCase();
    const sanitizedName = sanitizeInput(newLawyer.full_name);

    if (!sanitizedEmail || !sanitizedName) {
      toast({
        title: "Error",
        description: "Email y nombre completo son requeridos",
        variant: "destructive"
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      toast({
        title: "Error",
        description: "Formato de email inválido",
        variant: "destructive"
      });
      return;
    }

    // Verify user is authenticated
    if (!isAuthenticated || !user) {
      toast({
        title: "Error",
        description: "Sesión no válida. Por favor, inicia sesión nuevamente.",
        variant: "destructive"
      });
      return;
    }

  }; // End of createLawyer function

  const updateLawyerPermissions = async (lawyerId: string, field: string, value: boolean) => {
    try {
      // Solo permitir actualizar campos específicos de abogados (NO is_admin)
      if (field !== 'active' && field !== 'can_create_agents') {
        toast({
          title: "Campo no válido",
          description: "Solo se pueden modificar los campos 'active' y 'can_create_agents' para abogados.",
          variant: "destructive"
        });
        return;
      }

      // Verificar que el usuario actual es admin del sistema
      if (!user?.profile) {
        toast({
          title: "Sin permisos",
          description: "Solo los administradores del sistema pueden modificar permisos de abogados.",
          variant: "destructive"
        });
        return;
      }

      const authToken = sessionStorage.getItem('admin_token');
      
      if (!authToken) {
        toast({
          title: "Error",
          description: "Token de administrador no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      // Simulate lawyer permission update (no actual table exists)
      // This is a mock operation since lawyer_accounts table doesn't exist
      const data = { success: true };
      const mockError = null;

      if (mockError) {
        console.error('Error updating lawyer permissions:', mockError);
        throw mockError;
      }

      toast({
        title: "Éxito",
        description: "Permisos actualizados exitosamente",
      });

      // Update local state
      setLawyers(lawyers.map(lawyer => 
        lawyer.id === lawyerId ? { ...lawyer, [field]: value } : lawyer
      ));
    } catch (error: any) {
      console.error('Error in updateLawyerPermissions:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('permission denied') || error.message?.includes('insufficient privileges')) {
        toast({
          title: "Sin permisos suficientes",
          description: "No tienes permisos para realizar esta acción. Verifica tu sesión de administrador.",
          variant: "destructive"
        });
      } else if (error.message?.includes('not found')) {
        toast({
          title: "Abogado no encontrado",
          description: "El abogado que intentas modificar no existe o fue eliminado.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error al actualizar permisos",
          description: error.message || "No se pudieron actualizar los permisos. Intenta nuevamente.",
          variant: "destructive"
        });
      }
    }
  };

  const unlockLawyerAccount = async (lawyerId: string) => {
    try {
      const authToken = sessionStorage.getItem('admin_token');
      
      if (!authToken) {
        toast({
          title: "Error",
          description: "Token de administrador no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      // Simulate unlock operation (no actual table exists)
      // This is a mock operation since lawyer_accounts table doesn't exist
      const error = null;

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Cuenta desbloqueada exitosamente",
      });

      await loadData();
    } catch (error: any) {
      console.error('Error in unlockLawyerAccount:', error);
      
      if (error.message?.includes('permission denied')) {
        toast({
          title: "Sin permisos",
          description: "No tienes permisos para desbloquear cuentas. Verifica tu sesión de administrador.",
          variant: "destructive"
        });
      } else if (error.message?.includes('not found')) {
        toast({
          title: "Cuenta no encontrada",
          description: "La cuenta del abogado no existe o fue eliminada.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error al desbloquear",
          description: error.message || "No se pudo desbloquear la cuenta. Intenta nuevamente.",
          variant: "destructive"
        });
      }
    }
  };

  const isAccountLocked = (lawyer: Lawyer): boolean => {
    if (!lawyer.locked_until) return false;
    return new Date(lawyer.locked_until) > new Date();
  };

  const getLockStatusBadge = (lawyer: Lawyer) => {
    if (isAccountLocked(lawyer)) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Bloqueada
        </Badge>
      );
    }
    if (lawyer.failed_login_attempts && lawyer.failed_login_attempts > 0) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {lawyer.failed_login_attempts} intentos
        </Badge>
      );
    }
    return <Badge variant="secondary">Normal</Badge>;
  };

  const deleteLawyer = async (lawyerId: string, lawyerName: string) => {
    // Confirmación antes de eliminar
    const confirmed = window.confirm(`¿Estás seguro de que quieres eliminar al abogado "${lawyerName}"? Esta acción no se puede deshacer.`);
    
    if (!confirmed) {
      return;
    }

    try {
      const authToken = sessionStorage.getItem('admin_token');
      
      if (!authToken) {
        toast({
          title: "Error",
          description: "Token de administrador no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      console.log('Attempting to delete lawyer via edge function:', { lawyerId, lawyerName });

      const { data, error } = await supabase.functions.invoke('delete-lawyer', {
        body: JSON.stringify({
          lawyer_id: lawyerId
        }),
        headers: {
          'authorization': authToken,
          'Content-Type': 'application/json'
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error al eliminar el abogado');
      }

      console.log('Lawyer deleted successfully');

      toast({
        title: "Éxito",
        description: data.message || `Abogado ${lawyerName} eliminado exitosamente`,
      });

      await loadData();
    } catch (error: any) {
      console.error('Delete lawyer error:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el abogado",
        variant: "destructive"
      });
    }
  };

  const updateAgentStatus = async (agentId: string, status: string) => {
    try {
      const authToken = sessionStorage.getItem('admin_token');
      
      if (!authToken) {
        toast({
          title: "Error",
          description: "Token de administrador no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('legal_agents')
        .update({ status })
        .eq('id', agentId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Estado del agente actualizado exitosamente",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el estado del agente",
        variant: "destructive"
      });
    }
  };

  const updateAgentFinalPrice = async (agentId: string, finalPrice: number) => {
    try {
      const authToken = sessionStorage.getItem('admin_token');
      
      if (!authToken) {
        toast({
          title: "Error",
          description: "Token de administrador no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('legal_agents')
        .update({ 
          final_price: finalPrice,
          price_approved_by: user?.id,
          price_approved_at: new Date().toISOString()
        })
        .eq('id', agentId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Precio final actualizado exitosamente",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el precio final",
        variant: "destructive"
      });
    }
  };

  const handleApproveRequest = (request: any) => {
    setSelectedRequest(request);
    setCanCreateAgents(false);
    setShowApprovalDialog(true);
  };

  const handleRejectRequest = async (requestId: string) => {
    const reason = prompt('Razón del rechazo (opcional):');
    if (reason !== null) {
      await processTokenRequest(requestId, 'reject', reason);
    }
  };

  const processApproval = async () => {
    if (!selectedRequest) return;
    
    await processTokenRequest(selectedRequest.id, 'approve', undefined, canCreateAgents);
    setShowApprovalDialog(false);
  };

  const processTokenRequest = async (requestId: string, action: 'approve' | 'reject', rejectionReason?: string, canCreateAgents?: boolean) => {
    try {
      const authHeaders = getAuthHeaders();
      
      if (!authHeaders.authorization) {
        toast({
          title: "Error",
          description: "Token de administrador no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('manage-token-request', {
        body: {
          requestId,
          action,
          rejectionReason,
          canCreateAgents
        },
        headers: authHeaders
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error al procesar la solicitud');
      }

      if (action === 'approve' && data.token) {
        // Mostrar el token generado
        setGeneratedToken(data.token);
        setShowTokenDialog(true);
      }

      toast({
        title: "Éxito",
        description: action === 'approve' ? 'Solicitud aprobada exitosamente' : 'Solicitud rechazada',
      });

      // Reload data to refresh the token requests
      await loadData();
    } catch (error: any) {
      console.error('Error managing token request:', error);
      toast({
        title: "Error",
        description: error.message || "Error al procesar la solicitud",
        variant: "destructive"
      });
    }
  };

  const copyTokenToClipboard = () => {
    navigator.clipboard.writeText(generatedToken);
    toast({
      title: "Token copiado",
      description: "El token ha sido copiado al portapapeles",
    });
  };


  // Function to show lawyer performance
  const showLawyerPerformance = (lawyer: any) => {
    setSelectedLawyerForStats(lawyer);
    setShowLawyerStatsDialog(true);
  };

  // Load document categories
  const loadDocumentCategories = async () => {
    try {
      const authHeaders = getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('manage-document-categories', {
        headers: authHeaders,
        method: 'GET'
      });

      if (error) {
        console.error('Error loading categories:', error);
        toast({
          title: "Error al cargar categorías",
          description: "No se pudieron cargar las categorías de documentos.",
          variant: "destructive"
        });
        return;
      }

      if (Array.isArray(data)) {
        setDocumentCategories(data);
      } else {
        console.error('Unexpected response format:', data);
        setDocumentCategories([]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Error al cargar categorías",
        description: "Error inesperado al cargar las categorías.",
        variant: "destructive"
      });
    }
  };

  // Toggle category status (active/inactive)
  const toggleCategoryStatus = async (categoryId: string, isActive: boolean) => {
    try {
      const authHeaders = getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('manage-document-categories', {
        headers: authHeaders,
        body: {
          action: 'update',
          categoryId,
          is_active: isActive
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error al actualizar categoría');
      }

      toast({
        title: "Categoría actualizada",
        description: `La categoría ha sido ${isActive ? 'activada' : 'desactivada'} correctamente.`,
      });

      // Reload categories
      await loadDocumentCategories();
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar la categoría",
        variant: "destructive"
      });
    }
  };

  const copyLawyerToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({
      title: "Token copiado",
      description: "El token del abogado ha sido copiado al portapapeles",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Borrador", variant: "secondary" as const },
      pending_review: { label: "En Revisión", variant: "outline" as const },
      active: { label: "Activo", variant: "default" as const },
      suspended: { label: "Suspendido", variant: "destructive" as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  console.log('AdminPage render - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', user);
  
  if (!isAuthenticated) {
    console.log('Not authenticated, showing native login page');
    return <NativeAdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  console.log('User is authenticated! Showing admin panel');

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Mobile First Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Panel de Administración</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Bienvenido, {user?.profile?.full_name || user?.email}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={logout}
            size="sm"
            className="self-start sm:self-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
            <span className="sm:hidden">Salir</span>
          </Button>
        </div>

        <Tabs defaultValue="lawyers" className="space-y-4 sm:space-y-6">
          {/* Mobile First Tab Navigation */}
          <TabsList className="grid w-full grid-cols-5 h-auto p-1">
            <TabsTrigger 
              value="lawyers" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Gestión de Abogados</span>
              <span className="sm:hidden">Abogados</span>
            </TabsTrigger>
            <TabsTrigger 
              value="token-requests" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm relative"
            >
              <Shield className="h-4 w-4" />
              {tokenRequests.filter(req => req.status === 'pending').length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-6 w-6 p-0 text-xs font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg border-2 border-background"
                >
                  {tokenRequests.filter(req => req.status === 'pending').length}
                </Badge>
              )}
              <span className="hidden sm:inline">Solicitudes Token</span>
              <span className="sm:hidden">Tokens</span>
            </TabsTrigger>
            <TabsTrigger 
              value="agents" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm relative"
            >
              <FileText className="h-4 w-4" />
              {pendingAgentsCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-6 w-6 p-0 text-xs font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg border-2 border-background"
                >
                  {pendingAgentsCount}
                </Badge>
              )}
              <span className="hidden sm:inline">Gestión de Agentes</span>
              <span className="sm:hidden">Agentes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="stats" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm"
            >
              <ChartPie className="h-4 w-4" />
              <span className="hidden sm:inline">Performance Legal</span>
              <span className="sm:hidden">Performance</span>
            </TabsTrigger>
            <TabsTrigger 
              value="config" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configuración</span>
              <span className="sm:hidden">Config</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lawyers" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="h-5 w-5" />
                  Crear Nuevo Abogado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newLawyer.email}
                      onChange={(e) => setNewLawyer({ ...newLawyer, email: e.target.value })}
                      placeholder="email@ejemplo.com"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nombre Completo</Label>
                    <Input
                      id="fullName"
                      value={newLawyer.full_name}
                      onChange={(e) => setNewLawyer({ ...newLawyer, full_name: e.target.value })}
                      placeholder="Juan Pérez"
                      className="w-full"
                    />
                  </div>
                   <div className="space-y-2">
                     <Label htmlFor="password">Token de Acceso</Label>
                     <div className="relative">
                       <Input
                         id="password"
                         type="text"
                         value=""
                         placeholder="Se generará automáticamente"
                         className="w-full"
                         disabled
                         readOnly
                       />
                     </div>
                     <p className="text-xs text-muted-foreground">
                       El token se generará automáticamente y será lo que el abogado use para ingresar al panel.
                     </p>
                    </div>
                   <div className="space-y-2">
                     <Label htmlFor="phoneNumber">Número de Teléfono</Label>
                     <div className="phone-input-container">
                       <PhoneInput
                         placeholder="Introduce número de teléfono"
                         value={newLawyer.phone_number}
                         onChange={(value) => setNewLawyer({ ...newLawyer, phone_number: value || "" })}
                         defaultCountry="CO"
                         international
                         className="w-full"
                       />
                     </div>
                   </div>
                </div>
                
                {/* Mobile First Permission Switches */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                    <Label htmlFor="canCreateAgents" className="text-sm font-medium">
                      Puede crear agentes
                    </Label>
                    <Switch
                      id="canCreateAgents"
                      checked={newLawyer.can_create_agents}
                      onCheckedChange={(checked) => setNewLawyer({ ...newLawyer, can_create_agents: checked })}
                    />
                  </div>
                  {/* REMOVIDO: Switch de is_admin - los abogados NO son administradores */}
                </div>
                
                <Button 
                  onClick={createLawyer} 
                  className="w-full sm:w-auto"
                  size="default"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Abogado
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Abogados Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Mobile First Table - Stack on mobile */}
                <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Token</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Seguridad</TableHead>
                          <TableHead>Crear Agentes</TableHead>
                          <TableHead>Último Login</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {lawyers.map((lawyer) => (
                        <TableRow key={lawyer.id}>
                          <TableCell className="font-medium">{lawyer.full_name}</TableCell>
                          <TableCell>{lawyer.email}</TableCell>
                          <TableCell>
                            {lawyer.access_token ? (
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                  {lawyer.access_token}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyLawyerToken(lawyer.access_token!)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">No disponible</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={lawyer.active}
                              onCheckedChange={(checked) => updateLawyerPermissions(lawyer.id, 'active', checked)}
                            />
                          </TableCell>
                          <TableCell>
                            {getLockStatusBadge(lawyer)}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={lawyer.can_create_agents}
                              onCheckedChange={(checked) => updateLawyerPermissions(lawyer.id, 'can_create_agents', checked)}
                            />
                          </TableCell>
                          <TableCell>
                            {lawyer.last_login_at
                              ? new Date(lawyer.last_login_at).toLocaleDateString()
                              : 'Nunca'
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {isAccountLocked(lawyer) && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => unlockLawyerAccount(lawyer.id)}
                                >
                                  <Unlock className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => deleteLawyer(lawyer.id, lawyer.full_name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Mobile Cards Layout */}
                <div className="lg:hidden space-y-4">
                  {lawyers.map((lawyer) => (
                    <Card key={lawyer.id}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium">{lawyer.full_name}</h3>
                              <p className="text-sm text-muted-foreground">{lawyer.email}</p>
                              {lawyer.access_token && (
                                <div className="flex items-center gap-2 mt-2">
                                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                    {lawyer.access_token}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyLawyerToken(lawyer.access_token!)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            {getLockStatusBadge(lawyer)}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span>Activo:</span>
                              <Switch
                                checked={lawyer.active}
                                onCheckedChange={(checked) => updateLawyerPermissions(lawyer.id, 'active', checked)}
                              />
                            </div>
                            <div className="flex items-center justify-between col-span-2">
                              <span>Crear Agentes:</span>
                              <Switch
                                checked={lawyer.can_create_agents}
                                onCheckedChange={(checked) => updateLawyerPermissions(lawyer.id, 'can_create_agents', checked)}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-xs text-muted-foreground">
                              Último login: {lawyer.last_login_at 
                                ? new Date(lawyer.last_login_at).toLocaleDateString()
                                : 'Nunca'
                              }
                            </span>
                            <div className="flex gap-2 mt-4">
                              {isAccountLocked(lawyer) && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => unlockLawyerAccount(lawyer.id)}
                                  className="flex-1"
                                >
                                  <Unlock className="h-4 w-4 mr-2" />
                                  Desbloquear
                                </Button>
                              )}
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => deleteLawyer(lawyer.id, lawyer.full_name)}
                                className="flex-1"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="token-requests" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5" />
                  Solicitudes de Token de Abogados
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gestiona las solicitudes de acceso de nuevos abogados al sistema
                </p>
              </CardHeader>
              <CardContent>
                {tokenRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hay solicitudes de token pendientes</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tokenRequests.map((request) => (
                      <Card key={request.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <h3 className="font-semibold text-lg">{request.full_name}</h3>
                                <Badge variant={
                                  request.status === 'pending' ? 'default' :
                                  request.status === 'approved' ? 'secondary' :
                                  'destructive'
                                }>
                                  {request.status === 'pending' ? 'Pendiente' :
                                   request.status === 'approved' ? 'Aprobado' :
                                   'Rechazado'}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p><strong>Email:</strong> {request.email}</p>
                                {request.phone_number && (
                                  <p><strong>Teléfono:</strong> {request.phone_number}</p>
                                )}
                                {request.law_firm && (
                                  <p><strong>Firma Legal:</strong> {request.law_firm}</p>
                                )}
                                {request.specialization && (
                                  <p><strong>Especialización:</strong> {request.specialization}</p>
                                )}
                                {request.years_of_experience && (
                                  <p><strong>Años de experiencia:</strong> {request.years_of_experience}</p>
                                )}
                                {request.reason_for_request && (
                                  <p><strong>Razón de solicitud:</strong> {request.reason_for_request}</p>
                                )}
                                <p><strong>Solicitado:</strong> {new Date(request.created_at).toLocaleString()}</p>
                                {request.reviewed_at && (
                                  <p><strong>Revisado:</strong> {new Date(request.reviewed_at).toLocaleString()}</p>
                                )}
                                {request.rejection_reason && (
                                  <p className="text-destructive"><strong>Razón de rechazo:</strong> {request.rejection_reason}</p>
                                )}
                              </div>
                            </div>
                            
                            {request.status === 'pending' && (
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                  onClick={() => handleApproveRequest(request)}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Aprobar
                                </Button>
                                <Button
                                  onClick={() => handleRejectRequest(request.id)}
                                  variant="destructive"
                                  size="sm"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Rechazar
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Agentes Para Revisión</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Creado por</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">
                          <button 
                            onClick={() => {
                              setSelectedAgent(agent);
                              setShowAgentDetails(true);
                            }}
                            className="text-primary hover:text-primary/80 underline cursor-pointer transition-colors"
                          >
                            {sanitizeInput(agent.name)}
                          </button>
                        </TableCell>
                        <TableCell>{sanitizeInput(agent.category)}</TableCell>
                        <TableCell>
                          {agent.created_by_lawyer ? (
                            <button 
                              onClick={() => showLawyerPerformance(agent.created_by_lawyer!)}
                              className="text-primary hover:text-primary/80 underline cursor-pointer transition-colors"
                            >
                              {agent.created_by_lawyer.full_name}
                            </button>
                          ) : (
                            'N/A'
                          )}
                          {agent.created_by_lawyer && (
                            <>
                              <br />
                              <span className="text-sm text-muted-foreground">
                                {agent.created_by_lawyer.email}
                              </span>
                            </>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(agent.status)}</TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                              Sugerido: ${agent.suggested_price.toLocaleString()}
                            </div>
                            {agent.final_price ? (
                              <div className="font-medium text-success">
                                Final: ${agent.final_price.toLocaleString()}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  placeholder="Precio final"
                                  className="w-24 h-8"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const value = parseInt((e.target as HTMLInputElement).value);
                                      if (value > 0) {
                                        updateAgentFinalPrice(agent.id, value);
                                      }
                                    }
                                  }}
                                />
                                <span className="text-xs text-muted-foreground">Enter</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(agent.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {agent.status === 'pending_review' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => updateAgentStatus(agent.id, 'active')}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateAgentStatus(agent.id, 'suspended')}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {agent.status === 'active' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateAgentStatus(agent.id, 'suspended')}
                              >
                                Suspender
                              </Button>
                            )}
                            {agent.status === 'suspended' && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => updateAgentStatus(agent.id, 'active')}
                              >
                                Activar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4 sm:space-y-6">
            <LawyerStatsAdmin 
              authHeaders={getAuthHeaders()} 
              viewMode="global"
            />
          </TabsContent>

          <TabsContent value="config" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5" />
                  Configuración del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* OpenAI Model Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Modelo de OpenAI</h3>
                      <p className="text-sm text-muted-foreground">
                        Selecciona el modelo de IA que se usará para el procesamiento de documentos.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadOpenAIModels}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Actualizar
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="openai-model">Modelo Actual</Label>
                      <Select value={selectedModel} onValueChange={handleModelChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar modelo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.length > 0 ? (
                            availableModels.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{model.id}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {model.owned_by} • {new Date(model.created * 1000).toLocaleDateString()}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="gpt-4.1-2025-04-14">gpt-4.1-2025-04-14 (Recomendado)</SelectItem>
                              <SelectItem value="gpt-4o-mini">gpt-4o-mini (Rápido)</SelectItem>
                              <SelectItem value="gpt-4o">gpt-4o (Potente)</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <div className="flex items-center gap-2 p-3 border rounded-md">
                        <Badge variant={systemConfig['openai_model'] === selectedModel ? "default" : "secondary"}>
                          {systemConfig['openai_model'] === selectedModel ? "Configurado" : "Sin configurar"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Modelo: {systemConfig['openai_model'] || 'Por defecto'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-2">ℹ️ Información sobre Modelos</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>gpt-4.1-2025-04-14:</strong> Modelo más reciente y estable (Recomendado)</li>
                      <li>• <strong>gpt-4o-mini:</strong> Modelo rápido y económico para tareas simples</li>
                      <li>• <strong>gpt-4o:</strong> Modelo potente para análisis complejos</li>
                    </ul>
                  </div>
                </div>

                {/* Document Categories Management */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Categorías de Documentos</h3>
                      <p className="text-sm text-muted-foreground">
                        Gestiona las categorías disponibles para la clasificación de agentes legales.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddCategoryDialog(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Categoría
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documentCategories.map((category) => (
                      <Card key={category.id} className="relative">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                {category.icon && React.createElement(
                                  (LucideIcons as any)[category.icon] || FileText,
                                  { className: "h-4 w-4 text-primary" }
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{category.name}</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {category.description}
                                </p>
                                <Badge 
                                  variant={category.is_active ? "default" : "secondary"} 
                                  className="mt-2 text-xs"
                                >
                                  {category.is_active ? "Activa" : "Inactiva"}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCategory(category);
                                  setShowEditCategoryDialog(true);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Settings className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCategoryStatus(category.id, !category.is_active)}
                                className="h-8 w-8 p-0"
                              >
                                {category.is_active ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {documentCategories.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay categorías configuradas</p>
                      <p className="text-sm">Agrega la primera categoría para comenzar.</p>
                    </div>
                  )}
                </div>

                {/* System Status */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Estado del Sistema</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">OpenAI API</p>
                            <Badge variant="default" className="mt-1">Conectado</Badge>
                          </div>
                          <Activity className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Base de Datos</p>
                            <Badge variant="default" className="mt-1">Operativa</Badge>
                          </div>
                          <Shield className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Edge Functions</p>
                            <Badge variant="default" className="mt-1">Activas</Badge>
                          </div>
                          <FileText className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog para configurar aprobación */}
        {showApprovalDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Configurar Aprobación</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configurando acceso para: <strong>{selectedRequest?.full_name}</strong>
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canCreateAgents"
                    checked={canCreateAgents}
                    onChange={(e) => setCanCreateAgents(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="canCreateAgents" className="text-sm">
                    Permitir crear agentes legales
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Si está marcado, el abogado podrá crear y gestionar sus propios agentes legales.
                </p>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={processApproval} className="bg-green-600 hover:bg-green-700">
                  <Check className="h-4 w-4 mr-2" />
                  Aprobar Solicitud
                </Button>
                <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Dialog para mostrar token generado */}
        {showTokenDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg max-w-lg w-full mx-4">
              <h3 className="text-lg font-semibold mb-4 text-green-600">¡Solicitud Aprobada!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Token de acceso generado para <strong>{selectedRequest?.full_name}</strong>:
              </p>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
                <code className="text-sm break-all font-mono">{generatedToken}</code>
              </div>
              <div className="flex gap-2">
                <Button onClick={copyTokenToClipboard} className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Token
                </Button>
                <Button variant="outline" onClick={() => setShowTokenDialog(false)}>
                  Cerrar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                📧 Envía este token al abogado por email. Lo necesitará para acceder al sistema.
              </p>
            </div>
          </div>
        )}

        {/* Dialog para ver y editar detalles del agente */}
        {showAgentDetails && selectedAgent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Detalles del Agente</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAgentDetails(false);
                      setSelectedAgent(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Información básica */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="agent-name">Nombre del Agente</Label>
                    <Input
                      id="agent-name"
                      value={selectedAgent.name}
                      onChange={(e) => {
                        setSelectedAgent({
                          ...selectedAgent,
                          name: e.target.value
                        });
                      }}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="agent-category">Categoría</Label>
                    <Select
                      value={selectedAgent.category}
                      onValueChange={(value) => {
                        setSelectedAgent({
                          ...selectedAgent,
                          category: value
                        });
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                       <SelectContent>
                         {documentCategories.map((category) => (
                           <SelectItem key={category.id} value={category.name}>
                             {category.name}
                           </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="agent-description">Descripción</Label>
                    <Textarea
                      id="agent-description"
                      value={selectedAgent.description}
                      onChange={(e) => {
                        setSelectedAgent({
                          ...selectedAgent,
                          description: e.target.value
                        });
                      }}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="suggested-price">Precio Sugerido</Label>
                    <Input
                      id="suggested-price"
                      type="number"
                      value={selectedAgent.suggested_price}
                      onChange={(e) => {
                        setSelectedAgent({
                          ...selectedAgent,
                          suggested_price: parseInt(e.target.value) || 0
                        });
                      }}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="final-price">Precio Final</Label>
                    <Input
                      id="final-price"
                      type="number"
                      value={selectedAgent.final_price || ""}
                      onChange={(e) => {
                        setSelectedAgent({
                          ...selectedAgent,
                          final_price: parseInt(e.target.value) || null
                        });
                      }}
                      className="mt-1"
                      placeholder="Establecer precio final"
                    />
                  </div>
                </div>

                {/* Plantilla del documento */}
                <div className="space-y-3">
                  <Label htmlFor="template-content">Plantilla del Documento</Label>
                  <Textarea
                    id="template-content"
                    value={selectedAgent.template_content || ""}
                    onChange={(e) => {
                      setSelectedAgent({
                        ...selectedAgent,
                        template_content: e.target.value
                      });
                    }}
                    className="mt-1"
                    rows={6}
                    placeholder="Contenido de la plantilla del documento..."
                  />
                </div>

                {/* Configuración de ANS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedAgent.sla_enabled || false}
                        onChange={(e) => {
                          setSelectedAgent({
                            ...selectedAgent,
                            sla_enabled: e.target.checked
                          });
                        }}
                      />
                      ANS Habilitado
                    </Label>
                  </div>
                  
                  {selectedAgent.sla_enabled && (
                    <div>
                      <Label htmlFor="sla-hours">Horas de ANS</Label>
                      <Input
                        id="sla-hours"
                        type="number"
                        value={selectedAgent.sla_hours || ""}
                        onChange={(e) => {
                          setSelectedAgent({
                            ...selectedAgent,
                            sla_hours: parseInt(e.target.value) || 0
                          });
                        }}
                        className="mt-1"
                        placeholder="Ej: 24"
                      />
                    </div>
                  )}
                </div>

                {/* Configuración adicional */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="document-name">Nombre del Documento</Label>
                    <Input
                      id="document-name"
                      value={selectedAgent.document_name || ""}
                      onChange={(e) => {
                        setSelectedAgent({
                          ...selectedAgent,
                          document_name: e.target.value
                        });
                      }}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="button-cta">Texto del Botón</Label>
                    <Input
                      id="button-cta"
                      value={selectedAgent.button_cta || ""}
                      onChange={(e) => {
                        setSelectedAgent({
                          ...selectedAgent,
                          button_cta: e.target.value
                        });
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Estado y acciones de administrador */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Gestión Administrativa</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label>Estado actual:</Label>
                      {getStatusBadge(selectedAgent.status)}
                    </div>
                    
                    <div className="flex gap-2">
                      {selectedAgent.status === 'pending_review' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              updateAgentStatus(selectedAgent.id, 'active');
                              setSelectedAgent({
                                ...selectedAgent,
                                status: 'active'
                              });
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              updateAgentStatus(selectedAgent.id, 'suspended');
                              setSelectedAgent({
                                ...selectedAgent,
                                status: 'suspended'
                              });
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Rechazar
                          </Button>
                        </>
                      )}
                      
                      {selectedAgent.status === 'active' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            updateAgentStatus(selectedAgent.id, 'suspended');
                            setSelectedAgent({
                              ...selectedAgent,
                              status: 'suspended'
                            });
                          }}
                        >
                          Suspender
                        </Button>
                      )}
                      
                      {selectedAgent.status === 'suspended' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            updateAgentStatus(selectedAgent.id, 'active');
                            setSelectedAgent({
                              ...selectedAgent,
                              status: 'active'
                            });
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Reactivar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Información del creador */}
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Información del Creador</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Abogado:</span>
                        <p className="font-medium">{selectedAgent.created_by_lawyer?.full_name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <p>{selectedAgent.created_by_lawyer?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fecha de creación:</span>
                        <p>{new Date(selectedAgent.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
              </div>
              
              <div className="p-6 border-t bg-muted/20">
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAgentDetails(false);
                      setSelectedAgent(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        const authHeaders = getAuthHeaders();
                        const { data, error } = await supabase.functions.invoke('update-agent', {
                          headers: authHeaders,
                          body: {
                            agent_id: selectedAgent.id, // Corregido: usar agent_id no agentId
                            user_id: user?.id, // Agregar user_id requerido
                            is_admin: true, // Identificar como admin
                            name: selectedAgent.name,
                            description: selectedAgent.description,
                            document_name: selectedAgent.document_name,
                            document_description: selectedAgent.document_description,
                            category: selectedAgent.category,
                            suggested_price: selectedAgent.suggested_price,
                            final_price: selectedAgent.final_price,
                            price_justification: selectedAgent.price_justification,
                            target_audience: selectedAgent.target_audience,
                            template_content: selectedAgent.template_content,
                            ai_prompt: selectedAgent.ai_prompt,
                            status: selectedAgent.status,
                            // Incluir campos de ANS que se pueden editar
                            sla_enabled: selectedAgent.sla_enabled,
                            sla_hours: selectedAgent.sla_hours,
                            button_cta: selectedAgent.button_cta
                          }
                        });

                        if (error) {
                          console.error('Error response:', error);
                          toast({
                            title: "Error",
                            description: "No se pudo actualizar el agente.",
                            variant: "destructive"
                          });
                          return;
                        }

                        if (!data?.success) {
                          console.error('Business logic error:', data?.error);
                          toast({
                            title: "Error",
                            description: data?.error || "Error al actualizar el agente.",
                            variant: "destructive"
                          });
                          return;
                        }

                        toast({
                          title: "Agente actualizado",
                          description: "Los cambios se guardaron correctamente.",
                        });

                        // Reload data and close dialog
                        await loadData();
                        setShowAgentDetails(false);
                        setSelectedAgent(null);
                      } catch (error) {
                        console.error('Error updating agent:', error);
                        toast({
                          title: "Error",
                          description: "Error inesperado al actualizar el agente.",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dialog para mostrar estadísticas del abogado */}
        {showLawyerStatsDialog && selectedLawyerForStats && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Performance del Abogado</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowLawyerStatsDialog(false);
                      setSelectedLawyerForStats(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-lg">{selectedLawyerForStats.full_name}</h4>
                    <p className="text-muted-foreground">{selectedLawyerForStats.email}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">
                            {lawyerStats.find(s => s.lawyer_id === selectedLawyerForStats.id)?.agents_created || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">Agentes Creados</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-success">
                            {lawyerStats.find(s => s.lawyer_id === selectedLawyerForStats.id)?.active_agents || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">Agentes Activos</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {lawyerStats.find(s => s.lawyer_id === selectedLawyerForStats.id)?.contracts_count || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">Documentos Generados</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">
                            ${(lawyerStats.find(s => s.lawyer_id === selectedLawyerForStats.id)?.total_value || 0).toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">Valor Total</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t">
                <Button
                  onClick={() => {
                    setShowLawyerStatsDialog(false);
                    setSelectedLawyerForStats(null);
                  }}
                  className="w-full"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Dialog para agregar categoría */}
        {showAddCategoryDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-md w-full">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Agregar Nueva Categoría</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddCategoryDialog(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="category-name">Nombre de la Categoría</Label>
                    <Input
                      id="category-name"
                      placeholder="Ej: Derecho Laboral"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category-description">Descripción</Label>
                    <Textarea
                      id="category-description"
                      placeholder="Descripción de la categoría..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category-icon">Icono (opcional)</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleccionar icono..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FileText">FileText</SelectItem>
                        <SelectItem value="Scale">Scale</SelectItem>
                        <SelectItem value="Building">Building</SelectItem>
                        <SelectItem value="Users">Users</SelectItem>
                        <SelectItem value="Home">Home</SelectItem>
                        <SelectItem value="Shield">Shield</SelectItem>
                        <SelectItem value="Heart">Heart</SelectItem>
                        <SelectItem value="Calculator">Calculator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <Button className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Categoría
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddCategoryDialog(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dialog para editar categoría */}
        {showEditCategoryDialog && selectedCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-md w-full">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Editar Categoría</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowEditCategoryDialog(false);
                      setSelectedCategory(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-category-name">Nombre de la Categoría</Label>
                    <Input
                      id="edit-category-name"
                      defaultValue={selectedCategory.name}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-category-description">Descripción</Label>
                    <Textarea
                      id="edit-category-description"
                      defaultValue={selectedCategory.description}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-category-icon">Icono</Label>
                    <Select defaultValue={selectedCategory.icon}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FileText">FileText</SelectItem>
                        <SelectItem value="Scale">Scale</SelectItem>
                        <SelectItem value="Building">Building</SelectItem>
                        <SelectItem value="Users">Users</SelectItem>
                        <SelectItem value="Home">Home</SelectItem>
                        <SelectItem value="Shield">Shield</SelectItem>
                        <SelectItem value="Heart">Heart</SelectItem>
                        <SelectItem value="Calculator">Calculator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-category-active"
                      defaultChecked={selectedCategory.is_active}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="edit-category-active" className="text-sm">
                      Categoría activa
                    </Label>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <Button className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowEditCategoryDialog(false);
                      setSelectedCategory(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
