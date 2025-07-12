import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useNativeAdminAuth } from "@/hooks/useNativeAdminAuth";
import NativeAdminLogin from "./NativeAdminLogin";
import { Users, FileText, Shield, Plus, Check, X, BarChart3, TrendingUp, DollarSign, Activity, LogOut, Unlock, AlertTriangle, Eye, EyeOff, Trash2 } from "lucide-react";
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
  lawyer_accounts?: {
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

export default function AdminPage() {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [lawyerStats, setLawyerStats] = useState<LawyerStats[]>([]);
  const [businessStats, setBusinessStats] = useState<BusinessStats | null>(null);
  const [contracts, setContracts] = useState<ContractDetail[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [showNewPassword, setShowNewPassword] = useState(false);
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

    try {
      const authHeaders = getAuthHeaders();
      
      if (!authHeaders.authorization) {
        toast({
          title: "Error",
          description: "Token de autenticación no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      console.log('=== CREATING LAWYER ===');
      console.log('Admin user:', user.email);

      const requestPayload = {
        email: sanitizedEmail,
        full_name: sanitizedName,
        phone_number: newLawyer.phone_number,
        can_create_agents: newLawyer.can_create_agents
      };
      console.log('Request data:', requestPayload);

      const { data, error } = await supabase.functions.invoke('create-lawyer', {
          body: JSON.stringify(requestPayload),       // ← Aquí haces stringify
          headers: {
            Authorization: authHeaders.authorization,  // Asegúrate de que incluya “Bearer …”
            'Content-Type': 'application/json'        // Y el Content-Type correcto
          }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Error en la función del servidor');
      }

      if (!data?.success) {
        console.error('Business logic error:', data?.error);
        throw new Error(data?.error || 'Error al crear el abogado');
      }

      // Success - show the generated token
      const lawyerToken = data.lawyer?.secure_password;
      if (lawyerToken) {
        toast({
          title: "✅ Abogado creado exitosamente",
          description: `Token de acceso: ${lawyerToken}`,
          duration: 15000,
        });

        // Show detailed alert with token
        setTimeout(() => {
          alert(`🎉 Abogado creado exitosamente!\n\n👤 Nombre: ${sanitizedName}\n📧 Email: ${sanitizedEmail}\n🔑 Token de acceso: ${lawyerToken}\n\n⚠️ IMPORTANTE: Comparte este token con el abogado para que pueda acceder al sistema.`);
        }, 500);
      } else {
        toast({
          title: "✅ Abogado creado",
          description: "El abogado ha sido creado exitosamente",
        });
      }

      // Reset form
      setNewLawyer({
        email: "",
        full_name: "",
        phone_number: "",
        can_create_agents: false
      });

      // Refresh data
      await loadData();
      
    } catch (error: any) {
      console.error('Create lawyer error:', error);
      
      let errorMessage = "Error desconocido al crear el abogado";
      
      if (error.message?.includes('Authentication failed')) {
        errorMessage = "Error de autenticación. Por favor, inicia sesión nuevamente.";
      } else if (error.message?.includes('Admin privileges required')) {
        errorMessage = "No tienes permisos de administrador para realizar esta acción.";
      } else if (error.message?.includes('Email already exists')) {
        errorMessage = "Ya existe un abogado registrado con este email.";
      } else if (error.message?.includes('Invalid email format')) {
        errorMessage = "El formato del email no es válido.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "❌ Error al crear abogado",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

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

      // Use direct query with admin privileges (similar to how agents are updated)
      const { data, error } = await supabase
        .from('lawyer_accounts')
        .update({ [field]: value })
        .eq('id', lawyerId)
        .select();

      if (error) {
        console.error('Error updating lawyer permissions:', error);
        throw error;
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

      const { error } = await supabase
        .from('lawyer_accounts')
        .update({ 
          failed_login_attempts: 0,
          locked_until: null 
        })
        .eq('id', lawyerId);

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
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger 
              value="lawyers" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Gestión de Abogados</span>
              <span className="sm:hidden">Abogados</span>
            </TabsTrigger>
            <TabsTrigger 
              value="agents" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Gestión de Agentes</span>
              <span className="sm:hidden">Agentes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="stats" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Estadísticas</span>
              <span className="sm:hidden">Stats</span>
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
                        <TableCell className="font-medium">{sanitizeInput(agent.name)}</TableCell>
                        <TableCell>{sanitizeInput(agent.category)}</TableCell>
                        <TableCell>
                          {agent.lawyer_accounts?.full_name || 'N/A'}
                          <br />
                          <span className="text-sm text-muted-foreground">
                            {agent.lawyer_accounts?.email || 'N/A'}
                          </span>
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
            {/* Mobile First Business Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Abogados</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold">{businessStats?.total_lawyers || 0}</div>
                  <p className="text-xs text-muted-foreground">Registro total</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Agentes Activos</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold">{businessStats?.active_agents || 0}</div>
                  <p className="text-xs text-muted-foreground">de {businessStats?.total_agents || 0} totales</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Contratos</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{businessStats?.total_contracts || 0}</div>
                  <p className="text-xs text-muted-foreground">+{businessStats?.monthly_growth || 0}% este mes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${businessStats?.total_revenue?.toLocaleString() || 0}</div>
                  <p className="text-xs text-muted-foreground">Total acumulado</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tendencia Mensual de Contratos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="contratos" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ingresos Mensuales</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Ingresos']} />
                      <Legend />
                      <Bar dataKey="ingresos" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Lawyer Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas por Abogado</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Abogado</TableHead>
                      <TableHead>Contratos</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Agentes Creados</TableHead>
                      <TableHead>Agentes Activos</TableHead>
                      <TableHead>Rendimiento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lawyerStats.map((stat) => (
                      <TableRow key={stat.lawyer_id}>
                        <TableCell className="font-medium">{stat.lawyer_name}</TableCell>
                        <TableCell>{stat.contracts_count}</TableCell>
                        <TableCell>${stat.total_value.toLocaleString()}</TableCell>
                        <TableCell>{stat.agents_created}</TableCell>
                        <TableCell>
                          <Badge variant={stat.active_agents > 0 ? "default" : "secondary"}>
                            {stat.active_agents}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">
                              {stat.total_value > 50000 ? 'Excelente' : stat.total_value > 20000 ? 'Bueno' : 'Regular'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Recent Contracts */}
            <Card>
              <CardHeader>
                <CardTitle>Contratos Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de Documento</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.slice(0, 10).map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">{sanitizeInput(contract.document_type)}</TableCell>
                        <TableCell>
                          {contract.user_name ? sanitizeInput(contract.user_name) : 'Anónimo'}
                          {contract.user_email && (
                            <div className="text-sm text-muted-foreground">{sanitizeInput(contract.user_email)}</div>
                          )}
                        </TableCell>
                        <TableCell>${contract.price.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            contract.status === 'pagado' ? 'default' :
                            contract.status === 'revisado' ? 'secondary' :
                            'outline'
                          }>
                            {contract.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(contract.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}