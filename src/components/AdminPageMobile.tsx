import React, { useState, useEffect } from "react";
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
import { useAdminAuth } from "@/hooks/useAdminAuth";
import AdminLogin from "./AdminLogin";
import LawyerStatsAdmin from "./LawyerStatsAdmin";
import { Users, FileText, Shield, Plus, Check, X, BarChart3, LogOut, RefreshCw, Trash2, Copy, EyeOff, Settings, BookOpen, AlertTriangle } from "lucide-react";
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
  phone_number?: string;
}

interface TokenRequest {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  law_firm?: string;
  specialization?: string;
  years_of_experience?: number;
  reason_for_request?: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

const AdminPageMobile = () => {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user, logout, getAuthHeaders, checkAuthStatus } = useAdminAuth();
  
  // Estados
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [tokenRequests, setTokenRequests] = useState<TokenRequest[]>([]);
  const [showAddLawyer, setShowAddLawyer] = useState(false);
  const [generatedToken, setGeneratedToken] = useState("");
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  
  // Nuevo abogado form
  const [newLawyer, setNewLawyer] = useState({
    email: "",
    full_name: "",
    phone_number: "",
    can_create_agents: false
  });

  // Cargar datos
  const loadData = async () => {
    try {
      console.log('Loading data...');
      const authHeaders = getAuthHeaders();
      
      if (!authHeaders.authorization) {
        console.log('No auth headers available');
        return;
      }

      // Cargar abogados
      const { data: lawyersData, error: lawyersError } = await supabase.functions.invoke('get-lawyers-admin', {
        headers: authHeaders
      });

      if (lawyersError) {
        console.error('Error loading lawyers:', lawyersError);
      } else {
        setLawyers(lawyersData || []);
      }

      // Cargar solicitudes de tokens
      const { data: requestsData, error: requestsError } = await supabase.functions.invoke('get-token-requests', {
        headers: authHeaders
      });

      if (requestsError) {
        console.error('Error loading token requests:', requestsError);
      } else {
        setTokenRequests(requestsData || []);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Crear abogado
  const createLawyer = async () => {
    if (!newLawyer.email || !newLawyer.full_name) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    try {
      const authHeaders = getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('create-lawyer', {
        body: JSON.stringify(newLawyer),
        headers: authHeaders
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error al crear el abogado');
      }

      toast({
        title: "Éxito",
        description: `Abogado ${newLawyer.full_name} creado exitosamente`,
      });

      setNewLawyer({
        email: "",
        full_name: "",
        phone_number: "",
        can_create_agents: false
      });

      await loadData();
    } catch (error: any) {
      console.error('Create lawyer error:', error);
      toast({
        title: "Error",
        description: error.message || "Error al crear el abogado",
        variant: "destructive"
      });
    }
  };

  // Eliminar abogado
  const deleteLawyer = async (lawyerId: string, lawyerName: string) => {
    const confirmed = confirm(`¿Estás seguro de que quieres eliminar a ${lawyerName}?`);
    
    if (!confirmed) {
      return;
    }

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

      const { data, error } = await supabase.functions.invoke('delete-lawyer', {
        body: JSON.stringify({
          lawyer_id: lawyerId
        }),
        headers: {
          'authorization': authHeaders.authorization,
          'Content-Type': 'application/json'
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error al eliminar el abogado');
      }

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

  // Aprobar solicitud
  const handleApproveRequest = async (request: TokenRequest) => {
    try {
      const authHeaders = getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('manage-token-request', {
        body: JSON.stringify({
          request_id: request.id,
          action: 'approve',
          email: request.email,
          full_name: request.full_name,
          phone_number: request.phone_number,
        }),
        headers: authHeaders
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error al aprobar la solicitud');
      }

      setGeneratedToken(data.access_token);
      setShowTokenDialog(true);
      await loadData();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: error.message || "Error al aprobar la solicitud",
        variant: "destructive"
      });
    }
  };

  // Rechazar solicitud
  const handleRejectRequest = async (requestId: string) => {
    const reason = prompt("Motivo del rechazo (opcional):");
    
    try {
      const authHeaders = getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('manage-token-request', {
        body: JSON.stringify({
          request_id: requestId,
          action: 'reject',
          rejection_reason: reason
        }),
        headers: authHeaders
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error al rechazar la solicitud');
      }

      toast({
        title: "Solicitud rechazada",
        description: "La solicitud ha sido rechazada exitosamente",
      });

      await loadData();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: error.message || "Error al rechazar la solicitud",
        variant: "destructive"
      });
    }
  };

  // Badge de estado de seguridad
  const getLockStatusBadge = (lawyer: Lawyer) => {
    const isLocked = lawyer.locked_until && new Date(lawyer.locked_until) > new Date();
    
    if (isLocked) {
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

  // Copiar token
  const copyTokenToClipboard = () => {
    navigator.clipboard.writeText(generatedToken);
    toast({
      title: "Token copiado",
      description: "El token ha sido copiado al portapapeles",
    });
  };

  // Efectos
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, isLoading]);

  // Estados de carga
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

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Mobile Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="flex items-center justify-between p-3 sm:p-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                Admin Panel
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                {user?.name || user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={checkAuthStatus}
              className="p-2 hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto px-3 sm:px-4 py-4 max-w-7xl">
        <Tabs defaultValue="lawyers" className="space-y-3 sm:space-y-6">
          {/* Mobile-Optimized Tab Navigation */}
          <div className="bg-white rounded-lg border shadow-sm p-2">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 gap-1 h-auto bg-slate-50 p-1 rounded-md">
              <TabsTrigger 
                value="lawyers" 
                className="flex flex-col items-center gap-1 p-3 text-xs sm:text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
              >
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-medium">Abogados</span>
              </TabsTrigger>
              <TabsTrigger 
                value="token-requests" 
                className="flex flex-col items-center gap-1 p-3 text-xs sm:text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all relative"
              >
                <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                {tokenRequests.filter(req => req.status === 'pending').length > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs font-bold rounded-full flex items-center justify-center animate-pulse"
                  >
                    {tokenRequests.filter(req => req.status === 'pending').length}
                  </Badge>
                )}
                <span className="font-medium">Tokens</span>
              </TabsTrigger>
              <TabsTrigger 
                value="stats" 
                className="flex flex-col items-center gap-1 p-3 text-xs sm:text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
              >
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-medium">Stats</span>
              </TabsTrigger>
              <TabsTrigger 
                value="config" 
                className="flex flex-col items-center gap-1 p-3 text-xs sm:text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
              >
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-medium">Config</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Gestión de Abogados */}
          <TabsContent value="lawyers" className="space-y-4">
            {/* Crear Nuevo Abogado */}
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
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="phoneNumber">Número de Teléfono</Label>
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
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <Label htmlFor="canCreateAgents" className="text-sm font-medium">
                    Puede crear agentes
                  </Label>
                  <Switch
                    id="canCreateAgents"
                    checked={newLawyer.can_create_agents}
                    onCheckedChange={(checked) => setNewLawyer({ ...newLawyer, can_create_agents: checked })}
                  />
                </div>
                
                <Button onClick={createLawyer} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Abogado
                </Button>
              </CardContent>
            </Card>

            {/* Lista de Abogados */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Abogados Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Mobile Cards View */}
                <div className="lg:hidden space-y-3">
                  {lawyers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay abogados registrados</p>
                    </div>
                  ) : (
                    lawyers.map((lawyer) => (
                      <Card key={lawyer.id} className="border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Header Row */}
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-sm truncate">{lawyer.full_name}</h3>
                                <p className="text-xs text-muted-foreground truncate">{lawyer.email}</p>
                              </div>
                              <Badge variant={lawyer.active ? "default" : "secondary"} className="ml-2 flex-shrink-0">
                                {lawyer.active ? "Activo" : "Inactivo"}
                              </Badge>
                            </div>
                            
                            {/* Status Badges */}
                            <div className="flex flex-wrap gap-2">
                              {getLockStatusBadge(lawyer)}
                              <Badge variant={lawyer.can_create_agents ? "default" : "outline"} className="text-xs">
                                {lawyer.can_create_agents ? "Crea Agentes" : "Sin Agentes"}
                              </Badge>
                            </div>
                            
                            {/* Token Info */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Token:</span>
                              {lawyer.access_token ? (
                                <div className="flex items-center gap-1">
                                  <EyeOff className="h-3 w-3" />
                                  <span className="font-mono">***...{lawyer.access_token.slice(-4)}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigator.clipboard.writeText(lawyer.access_token!).then(() => toast({ title: "Token copiado al portapapeles" }))}
                                    className="h-5 w-5 p-0"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-red-500">Sin token</span>
                              )}
                            </div>
                            
                            {/* Last Login */}
                            {lawyer.last_login_at && (
                              <div className="text-xs text-muted-foreground">
                                Último acceso: {new Date(lawyer.last_login_at).toLocaleDateString('es-ES')}
                              </div>
                            )}
                            
                            {/* Actions */}
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteLawyer(lawyer.id, lawyer.full_name)}
                                className="w-full"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Crear Agentes</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lawyers.map((lawyer) => (
                        <TableRow key={lawyer.id}>
                          <TableCell className="font-medium">{lawyer.full_name}</TableCell>
                          <TableCell>{lawyer.email}</TableCell>
                          <TableCell>
                            <Badge variant={lawyer.active ? "default" : "secondary"}>
                              {lawyer.active ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={lawyer.can_create_agents ? "default" : "outline"}>
                              {lawyer.can_create_agents ? "Sí" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteLawyer(lawyer.id, lawyer.full_name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Solicitudes de Token */}
          <TabsContent value="token-requests" className="space-y-4">
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

          {/* Estadísticas */}
          <TabsContent value="stats" className="space-y-4">
            <LawyerStatsAdmin 
              authHeaders={getAuthHeaders()} 
              viewMode="global"
            />
          </TabsContent>

          {/* Configuración */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5" />
                  Configuración del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Funciones de configuración disponibles próximamente.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Token Dialog */}
      {showTokenDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4 text-green-600">¡Solicitud Aprobada!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Token de acceso generado:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
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
    </div>
  );
};

export default AdminPageMobile;