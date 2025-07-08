import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  FileText
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface LegalAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  template_content: string;
  ai_prompt: string;
  placeholder_fields: any; // JSONB field from database
  suggested_price: number;
  price_justification: string;
  status: 'active' | 'suspended' | 'draft';
  created_at: string;
  updated_at: string;
}

interface AgentManagerPageProps {
  onBack: () => void;
  lawyerData: any;
}

export default function AgentManagerPage({ onBack, lawyerData }: AgentManagerPageProps) {
  const [agents, setAgents] = useState<LegalAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<LegalAgent | null>(null);
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
        .eq('created_by', lawyerData.id)
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
    try {
      const { error } = await supabase
        .from('legal_agents')
        .update({ status: newStatus })
        .eq('id', agentId);

      if (error) {
        console.error('Error updating agent status:', error);
        toast({
          title: "Error al actualizar",
          description: "No se pudo cambiar el estado del agente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Estado actualizado",
        description: `El agente ha sido ${newStatus === 'active' ? 'activado' : 'suspendido'}.`,
      });

      // Update local state
      setAgents(agents.map(agent => 
        agent.id === agentId ? { ...agent, status: newStatus } : agent
      ));
    } catch (error) {
      console.error('Error:', error);
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
      default:
        return <Badge variant="secondary">{status}</Badge>;
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

        {/* Agents Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No has creado ningún agente aún. Ve al panel principal para crear tu primer agente.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            agents.map((agent) => (
              <Card key={agent.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{agent.name}</CardTitle>
                      <CardDescription className="text-sm mb-3">
                        {agent.description}
                      </CardDescription>
                    </div>
                    {getStatusBadge(agent.status)}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-muted-foreground">Categoría:</span>
                      <span>{agent.category}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-muted-foreground">Precio:</span>
                      <span className="font-medium">${agent.suggested_price.toLocaleString()} COP</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-muted-foreground">Creado:</span>
                      <span>{new Date(agent.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
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
                              <div className="p-4 bg-muted rounded-md text-xs font-mono max-h-40 overflow-y-auto whitespace-pre-wrap">
                                {selectedAgent.ai_prompt}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold mb-2">Variables del Documento</h4>
                              <div className="grid gap-2">
                                {selectedAgent.placeholder_fields.map((field, index) => (
                                  <div key={index} className="flex items-center gap-3 p-2 bg-muted rounded text-sm">
                                    <Badge variant="outline">{field.placeholder}</Badge>
                                    <span>{field.pregunta}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold mb-2">Información de Precio</h4>
                              <div className="p-4 bg-success/10 rounded-md border border-success/20">
                                <p className="text-2xl font-bold text-success">${selectedAgent.suggested_price.toLocaleString()} COP</p>
                                <p className="text-sm text-success/80 mt-1">{selectedAgent.price_justification}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    {/* Status Toggle */}
                    {agent.status === 'active' ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleStatusChange(agent.id, 'suspended')}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Suspender
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleStatusChange(agent.id, 'active')}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Activar
                      </Button>
                    )}

                    {/* Edit (Future implementation) */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled
                      title="Funcionalidad en desarrollo"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}