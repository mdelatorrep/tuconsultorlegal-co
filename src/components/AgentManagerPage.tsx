import { useState, useEffect } from "react";
import OpenAIAgentDebug from "./OpenAIAgentDebug";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuthManager } from "@/hooks/useAuthManager";
import { 
  ArrowLeft, 
  Edit, 
  Pause, 
  Play, 
  Trash2, 
  Eye,
  DollarSign,
  Calendar,
  User,
  FileText,
  Save,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LegalAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  template_content: string;
  ai_prompt: string;
  placeholder_fields: any; // JSONB field from database
  price: number;
  price_justification: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  document_name: string | null;
  document_description: string | null;
  target_audience: string | null;
  button_cta: string | null;
  frontend_icon: string | null;
}

interface AgentManagerPageProps {
  onBack: () => void;
  lawyerData: any;
}

export default function AgentManagerPage({ onBack, lawyerData }: AgentManagerPageProps) {
  const [agents, setAgents] = useState<LegalAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<LegalAgent | null>(null);
  const [editingAgent, setEditingAgent] = useState<LegalAgent | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const { getAuthHeaders } = useAuthManager();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      // Mostrar agentes en todos los estados: activos, pendientes y suspendidos
      const { data, error } = await supabase
        .from('legal_agents')
        .select('*')
        .eq('created_by', lawyerData.id) // Usar el ID del lawyer profile directamente
        .in('status', ['active', 'pending_review', 'suspended']) // Incluir también suspendidos
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching agents:', error);
        toast({
          title: "Error al cargar agentes",
          description: "No se pudieron cargar los agentes creados.",
          variant: "destructive",
        });
        return;
      }

      setAgents((data || []) as LegalAgent[]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (agentId: string, newStatus: 'active' | 'suspended') => {
    // Verificar que el usuario sea admin
    if (!lawyerData.is_admin) {
      toast({
        title: "Sin permisos",
        description: "Solo los administradores pueden cambiar el estado de los agentes.",
        variant: "destructive",
      });
      return;
    }

    try {
      const authHeaders = getAuthHeaders('lawyer');
      
      if (!authHeaders.authorization) {
        toast({
          title: "Error",
          description: "Token de autenticación no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('update-agent', {
        body: JSON.stringify({
          agent_id: agentId,
          user_id: lawyerData.id,
          is_admin: lawyerData.is_admin,
          status: newStatus
        }),
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error al actualizar el estado del agente');
      }

      toast({
        title: "Estado actualizado",
        description: data.message || `El agente ha sido ${newStatus === 'active' ? 'activado' : 'suspendido'}.`,
      });

      // Update local state
      setAgents(agents.map(agent => 
        agent.id === agentId ? { ...agent, status: newStatus } : agent
      ));
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error inesperado al actualizar el agente.",
        variant: "destructive",
      });
    }
  };

  const handleApproveAgent = async (agentId: string) => {
    // Verificar que el usuario sea admin
    if (!lawyerData.is_admin) {
      toast({
        title: "Sin permisos",
        description: "Solo los administradores pueden aprobar agentes.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Intentar ambos tipos de autenticación
      const lawyerHeaders = getAuthHeaders('lawyer');
      const adminHeaders = getAuthHeaders('admin');
      const authHeaders = lawyerHeaders.authorization ? lawyerHeaders : adminHeaders;
      
      if (!authHeaders.authorization) {
        toast({
          title: "Error",
          description: "Token de autenticación no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      // Primero obtener los datos del agente para copiar el nombre
      const agent = agents.find(a => a.id === agentId);
      if (!agent) {
        throw new Error('Agente no encontrado');
      }

      const { data, error } = await supabase.functions.invoke('update-agent', {
        body: {
          agent_id: agentId,
          user_id: lawyerData.id,
          is_admin: lawyerData.is_admin,
          status: 'active',
          document_name: agent.name // Copiar el nombre del agente al nombre del documento
        },
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (error) {
        console.error('Error updating agent:', error);
        throw error;
      }

      // Create OpenAI Agent after approval
      try {
        console.log('Creating OpenAI agent for approved agent:', agentId);
        const { data: openaiAgentResult, error: openaiError } = await supabase.functions.invoke('create-openai-agent', {
          body: {
            legalAgentId: agentId,
            agentConfig: {
              model: 'gpt-4o'
            }
          }
        });

        if (openaiError) {
          console.error('Error creating OpenAI agent:', openaiError);
          toast({
            title: "Agente aprobado con advertencia",
            description: "El agente fue aprobado exitosamente, pero hubo un problema al configurar el agente de IA. Se puede configurar manualmente después.",
            variant: "destructive",
          });
        } else {
          console.log('OpenAI agent created successfully:', openaiAgentResult);
          toast({
            title: "¡Agente aprobado y activado!",
            description: "El agente fue aprobado exitosamente y el agente de IA fue configurado correctamente.",
            variant: "default",
          });
        }
      } catch (error) {
        console.error('Error creating OpenAI agent:', error);
        toast({
          title: "Agente aprobado con advertencia",
          description: "El agente fue aprobado exitosamente, pero hubo un error al configurar el agente de IA.",
          variant: "destructive",
        });
      }

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error al aprobar el agente');
      }

      toast({
        title: "Agente aprobado",
        description: data.message || "El agente ha sido aprobado y está activo.",
      });

      // Update local state
      setAgents(agents.map(agent => 
        agent.id === agentId ? { 
          ...agent, 
          status: 'active',
          price_approved_by: lawyerData.id,
          price_approved_at: new Date().toISOString()
        } : agent
      ));
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error inesperado al aprobar el agente.",
        variant: "destructive",
      });
    }
  };

  const handleEditAgent = (agent: LegalAgent) => {
    // Los abogados pueden editar sus propios agentes
    setEditingAgent({ ...agent });
    setIsEditDialogOpen(true);
  };

  const handleSaveAgent = async () => {
    if (!editingAgent) return;

    try {
      // Intentar ambos tipos de autenticación
      const lawyerHeaders = getAuthHeaders('lawyer');
      const adminHeaders = getAuthHeaders('admin');
      const authHeaders = lawyerHeaders.authorization ? lawyerHeaders : adminHeaders;
      
      if (!authHeaders.authorization) {
        toast({
          title: "Error",
          description: "Token de autenticación no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('update-agent', {
        body: {
          agent_id: editingAgent.id,
          user_id: lawyerData.id,
          is_admin: lawyerData.is_admin,
          name: editingAgent.name,
          description: editingAgent.description,
          document_name: editingAgent.document_name,
          document_description: editingAgent.document_description,
          category: editingAgent.category,
          price: editingAgent.price,
          price_justification: editingAgent.price_justification,
          target_audience: editingAgent.target_audience,
          template_content: editingAgent.template_content,
          ai_prompt: editingAgent.ai_prompt
        },
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error al actualizar el agente');
      }

      toast({
        title: "Agente actualizado",
        description: data.message || "El agente ha sido actualizado correctamente.",
      });

      // Update local state
      setAgents(agents.map(agent => 
        agent.id === editingAgent.id ? editingAgent : agent
      ));
      
      setIsEditDialogOpen(false);
      setEditingAgent(null);
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error inesperado al actualizar el agente.",
        variant: "destructive",
      });
    }
  };

  const handleEditFieldChange = (field: string, value: any) => {
    if (!editingAgent) return;
    setEditingAgent({ ...editingAgent, [field]: value });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'suspended':
        return 'Suspendido';
      case 'draft':
        return 'Borrador';
      case 'pending_review':
        return 'Pendiente de Revisión';
      default:
        return status;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-success text-success-foreground">Activo</Badge>;
      case 'suspended':
        return <Badge variant="secondary">Suspendido</Badge>;
      case 'draft':
        return <Badge variant="outline">Borrador</Badge>;
      case 'pending_review':
        return <Badge variant="destructive">Pendiente de Revisión</Badge>;
      default:
        return <Badge variant="secondary">{getStatusText(status)}</Badge>;
    }
  };

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    // Los abogados pueden eliminar sus propios agentes, los admins pueden eliminar cualquiera
    // Confirmación antes de eliminar
    const confirmed = window.confirm(`¿Estás seguro de que quieres eliminar el agente "${agentName}"? Esta acción no se puede deshacer.`);
    
    if (!confirmed) {
      return;
    }

    try {
      // Intentar ambos tipos de autenticación
      const lawyerHeaders = getAuthHeaders('lawyer');
      const adminHeaders = getAuthHeaders('admin');
      const authHeaders = lawyerHeaders.authorization ? lawyerHeaders : adminHeaders;
      
      if (!authHeaders.authorization) {
        toast({
          title: "Error",
          description: "Token de autenticación no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('delete-agent', {
        body: JSON.stringify({
          agent_id: agentId,
          user_id: lawyerData.id,
          is_admin: lawyerData.is_admin
        }),
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error al eliminar el agente');
      }

      toast({
        title: "Agente eliminado",
        description: data.message || `Agente "${agentName}" eliminado exitosamente`,
      });

      // Update local state
      setAgents(agents.filter(agent => agent.id !== agentId));
    } catch (error: any) {
      console.error('Delete agent error:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el agente",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando agentes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Gestión de Agentes Legales
          </h1>
          <p className="text-lg text-muted-foreground">
            Administra tus agentes creados: activa, suspende o modifica según sea necesario.
          </p>
        </div>

        {/* Separar agentes por estado */}
        {agents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No has creado ningún agente aún. Ve al panel principal para crear tu primer agente.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Sección de Agentes Pendientes de Revisión */}
            {agents.filter(agent => agent.status === 'pending_review').length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-yellow-100 dark:bg-yellow-900 p-2 rounded-lg">
                    <FileText className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Agentes Pendientes de Revisión
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Agentes enviados para aprobación del administrador
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {agents.filter(agent => agent.status === 'pending_review').length}
                  </Badge>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {agents.filter(agent => agent.status === 'pending_review').map((agent) => (
                    <Card key={agent.id} className="relative border-yellow-200 dark:border-yellow-800">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg mb-2 line-clamp-2">{agent.name}</CardTitle>
                            <CardDescription className="text-sm mb-3 line-clamp-3">
                              {agent.description}
                            </CardDescription>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(agent.status)}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Categoría:</span>
                            <span className="truncate">{agent.category}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <DollarSign className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Precio:</span>
                            <span className="font-medium">{agent.price === 0 ? 'GRATIS' : `$${agent.price.toLocaleString()} COP`}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Creado:</span>
                            <span>{new Date(agent.created_at).toLocaleDateString()}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Variables:</span>
                            <span>{agent.placeholder_fields.length} campos</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-4 border-t">
                          {/* View Details */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedAgent(agent)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </DialogTrigger>
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
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">Información General</h4>
                                      <div className="space-y-2 text-sm">
                                        <div><strong>Categoría:</strong> {selectedAgent.category}</div>
                                        <div><strong>Precio:</strong> {selectedAgent.price === 0 ? 'GRATIS' : `$${selectedAgent.price.toLocaleString()} COP`}</div>
                                         <div><strong>Estado:</strong> {getStatusText(selectedAgent.status)}</div>
                                        <div><strong>Creado:</strong> {new Date(selectedAgent.created_at).toLocaleDateString()}</div>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <h4 className="font-semibold mb-2">Variables ({selectedAgent.placeholder_fields.length})</h4>
                                      <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
                                         {selectedAgent.placeholder_fields.map((field: any, index: number) => (
                                           <div key={index} className="p-2 bg-muted rounded">
                                             <div className="flex items-center gap-2 mb-1">
                                               <Badge variant="outline" className="text-xs">{field.placeholder || field.name}</Badge>
                                             </div>
                                             <p className="text-xs text-muted-foreground">{field.pregunta || field.description}</p>
                                           </div>
                                         ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>

                          {/* Edit */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditAgent(agent)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>

                          {/* Delete */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteAgent(agent.id, agent.name)}
                            className="text-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Sección de Agentes Activos */}
            {agents.filter(agent => agent.status === 'active').length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                    <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Agentes Activos
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Agentes aprobados y operativos en la plataforma
                    </p>
                  </div>
                  <Badge variant="default" className="ml-auto bg-success text-success-foreground">
                    {agents.filter(agent => agent.status === 'active').length}
                  </Badge>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {agents.filter(agent => agent.status === 'active').map((agent) => (
                    <Card key={agent.id} className="relative border-green-200 dark:border-green-800">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg mb-2 line-clamp-2">{agent.name}</CardTitle>
                            <CardDescription className="text-sm mb-3 line-clamp-3">
                              {agent.description}
                            </CardDescription>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(agent.status)}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Categoría:</span>
                            <span className="truncate">{agent.category}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <DollarSign className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Precio:</span>
                            <span className="font-medium">{agent.price === 0 ? 'GRATIS' : `$${agent.price.toLocaleString()} COP`}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Creado:</span>
                            <span>{new Date(agent.created_at).toLocaleDateString()}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Variables:</span>
                            <span>{agent.placeholder_fields.length} campos</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-4 border-t">
                          {/* View Details */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedAgent(agent)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </DialogTrigger>
                          </Dialog>

                          {/* Edit */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditAgent(agent)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>

                          {/* Suspend/Activate (solo para admin) */}
                          {lawyerData.is_admin && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleStatusChange(agent.id, agent.status === 'active' ? 'suspended' : 'active')}
                            >
                              {agent.status === 'active' ? (
                                <>
                                  <Pause className="h-4 w-4 mr-1" />
                                  Suspender
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-1" />
                                  Activar
                                </>
                              )}
                            </Button>
                          )}

                          {/* Delete */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteAgent(agent.id, agent.name)}
                            className="text-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Sección de Agentes Suspendidos */}
            {agents.filter(agent => agent.status === 'suspended').length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-red-100 dark:bg-red-900 p-2 rounded-lg">
                    <Pause className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Agentes Suspendidos
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Agentes temporalmente suspendidos por el administrador
                    </p>
                  </div>
                  <Badge variant="destructive" className="ml-auto">
                    {agents.filter(agent => agent.status === 'suspended').length}
                  </Badge>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {agents.filter(agent => agent.status === 'suspended').map((agent) => (
                    <Card key={agent.id} className="relative border-red-200 dark:border-red-800 opacity-75">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg mb-2 line-clamp-2">{agent.name}</CardTitle>
                            <CardDescription className="text-sm mb-3 line-clamp-3">
                              {agent.description}
                            </CardDescription>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(agent.status)}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Categoría:</span>
                            <span className="truncate">{agent.category}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <DollarSign className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Precio:</span>
                            <span className="font-medium">{agent.price === 0 ? 'GRATIS' : `$${agent.price.toLocaleString()} COP`}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Creado:</span>
                            <span>{new Date(agent.created_at).toLocaleDateString()}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Variables:</span>
                            <span>{agent.placeholder_fields.length} campos</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-4 border-t">
                          {/* View Details */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedAgent(agent)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </DialogTrigger>
                          </Dialog>

                          {/* Edit */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditAgent(agent)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>

                          {/* Reactivate (solo para admin) */}
                          {lawyerData.is_admin && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleStatusChange(agent.id, 'active')}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Reactivar
                            </Button>
                          )}

                          {/* Delete */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteAgent(agent.id, agent.name)}
                            className="text-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Mensaje cuando no hay agentes en ninguna categoría */}
            {agents.filter(agent => agent.status === 'pending_review').length === 0 && 
             agents.filter(agent => agent.status === 'active').length === 0 && 
             agents.filter(agent => agent.status === 'suspended').length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No tienes agentes en estas categorías. Ve al panel principal para crear un agente.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Dialog for viewing agent details */}
        <Dialog>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedAgent?.name}</DialogTitle>
              <DialogDescription>
                Detalles completos del agente legal
              </DialogDescription>
            </DialogHeader>
            
            {selectedAgent && (
              <div className="space-y-6">
                {/* OpenAI Agent Debug Component */}
                <OpenAIAgentDebug legalAgentId={selectedAgent.id} />
                
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Información General</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Categoría:</strong> {selectedAgent.category}</div>
                      <div><strong>Precio:</strong> {selectedAgent.price === 0 ? 'GRATIS' : `$${selectedAgent.price.toLocaleString()} COP`}</div>
                      <div><strong>Estado:</strong> {getStatusText(selectedAgent.status)}</div>
                      <div><strong>Creado:</strong> {new Date(selectedAgent.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Variables ({selectedAgent.placeholder_fields.length})</h4>
                    <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
                       {selectedAgent.placeholder_fields.map((field: any, index: number) => (
                         <div key={index} className="p-2 bg-muted rounded">
                           <div className="flex items-center gap-2 mb-1">
                             <Badge variant="outline" className="text-xs">{field.placeholder || field.name}</Badge>
                           </div>
                           <p className="text-xs text-muted-foreground">{field.pregunta || field.description}</p>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* Edit Agent Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                    <Input
                      id="category"
                      value={editingAgent.category}
                      onChange={(e) => handleEditFieldChange('category', e.target.value)}
                      placeholder="Categoría del agente"
                    />
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
                    onClick={handleSaveAgent}
                    className="flex-1 sm:flex-none"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                  
                  {lawyerData.is_admin && editingAgent.status === 'pending_review' && (
                    <Button 
                      onClick={() => {
                        handleApproveAgent(editingAgent.id);
                        setIsEditDialogOpen(false);
                      }}
                      className="flex-1 sm:flex-none bg-success hover:bg-success/90"
                    >
                      <Play className="h-4 w-4 mr-2" />
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
      </div>
    </div>
  );
}