import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Edit, Trash2, Eye, DollarSign, Calendar, FileText, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  placeholder_fields: any;
  suggested_price: number;
  final_price: number | null;
  status: 'active' | 'suspended' | 'draft' | 'pending_review';
  created_at: string;
  updated_at: string;
  document_name: string;
  document_description: string;
  target_audience: string;
}

interface AgentManagerPageProps {
  onBack: () => void;
}

export default function AgentManagerPage({ onBack }: AgentManagerPageProps) {
  const [agents, setAgents] = useState<LegalAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<LegalAgent | null>(null);
  const [editingAgent, setEditingAgent] = useState<LegalAgent | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('legal_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching agents:', error);
        toast({
          title: "Error al cargar agentes",
          description: "No se pudieron cargar los agentes.",
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
    try {
      const { error } = await supabase
        .from('legal_agents')
        .update({ status: newStatus })
        .eq('id', agentId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `El agente ha sido ${newStatus === 'active' ? 'activado' : 'suspendido'}.`,
      });

      setAgents(agents.map(agent => 
        agent.id === agentId ? { ...agent, status: newStatus } : agent
      ));
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el estado del agente.",
        variant: "destructive",
      });
    }
  };

  const handleEditAgent = (agent: LegalAgent) => {
    setEditingAgent({ ...agent });
    setIsEditDialogOpen(true);
  };

  const handleSaveAgent = async () => {
    if (!editingAgent) return;

    try {
      const { error } = await supabase
        .from('legal_agents')
        .update({
          name: editingAgent.name,
          description: editingAgent.description,
          document_name: editingAgent.document_name,
          document_description: editingAgent.document_description,
          category: editingAgent.category,
          suggested_price: editingAgent.suggested_price,
          final_price: editingAgent.final_price,
          target_audience: editingAgent.target_audience,
          template_content: editingAgent.template_content,
          ai_prompt: editingAgent.ai_prompt
        })
        .eq('id', editingAgent.id);

      if (error) throw error;

      toast({
        title: "Agente actualizado",
        description: "El agente ha sido actualizado correctamente.",
      });

      setAgents(agents.map(agent => 
        agent.id === editingAgent.id ? editingAgent : agent
      ));
      
      setIsEditDialogOpen(false);
      setEditingAgent(null);
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el agente.",
        variant: "destructive",
      });
    }
  };

  const handleEditFieldChange = (field: string, value: any) => {
    if (!editingAgent) return;
    setEditingAgent({ ...editingAgent, [field]: value });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Activo</Badge>;
      case 'suspended':
        return <Badge variant="secondary">Suspendido</Badge>;
      case 'draft':
        return <Badge variant="outline">Borrador</Badge>;
      case 'pending_review':
        return <Badge variant="destructive">Pendiente Revisión</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    const confirmed = window.confirm(`¿Estás seguro de que quieres eliminar el agente "${agentName}"?`);
    
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('legal_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      toast({
        title: "Agente eliminado",
        description: `Agente "${agentName}" eliminado exitosamente`,
      });

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
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Gestión de Agentes Legales
          </h1>
          <p className="text-lg text-muted-foreground">
            Administra los agentes legales disponibles en el sistema.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {agents.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No hay agentes disponibles en el sistema.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            agents.map((agent) => (
              <Card key={agent.id} className="relative">
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
                      <span className="font-medium">${agent.suggested_price.toLocaleString()} COP</span>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span className="text-muted-foreground">Creado:</span>
                      <span>{new Date(agent.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t">
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
                              <div className="p-4 bg-muted rounded-md text-xs font-mono max-h-40 overflow-y-auto whitespace-pre-wrap">
                                {selectedAgent.ai_prompt}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold mb-2">Información de Precio</h4>
                              <div className="p-4 bg-green-50 rounded-md border border-green-200">
                                <p className="text-2xl font-bold text-green-700">${selectedAgent.suggested_price.toLocaleString()} COP</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditAgent(agent)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>

                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteAgent(agent.id, agent.name)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

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
                    value={editingAgent.document_name}
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
                  <Label htmlFor="suggested_price">Precio Sugerido (COP)</Label>
                  <Input
                    id="suggested_price"
                    type="number"
                    value={editingAgent.suggested_price}
                    onChange={(e) => handleEditFieldChange('suggested_price', parseInt(e.target.value) || 0)}
                    placeholder="Precio sugerido"
                  />
                </div>
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

              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleSaveAgent}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
                
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}