import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Edit2, Trash2, Bot, Briefcase, Scale, Building2, Receipt, 
  Landmark, Shield, Eye, Save, RefreshCw, Users, Star, TrendingUp,
  MessageSquare, Zap, Copy, ExternalLink
} from "lucide-react";

interface SpecializedAgent {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  category: string;
  target_audience: string;
  icon: string;
  color_class: string;
  openai_workflow_id: string | null;
  openai_assistant_id: string | null;
  agent_instructions: string | null;
  credits_per_session: number;
  max_messages_per_session: number;
  is_premium: boolean;
  requires_subscription: string | null;
  status: string;
  display_order: number;
  is_featured: boolean;
  usage_count: number;
  avg_rating: number;
  created_at: string;
}

const ICON_OPTIONS = [
  { value: 'Bot', label: 'Bot', icon: Bot },
  { value: 'Briefcase', label: 'Maletín', icon: Briefcase },
  { value: 'Scale', label: 'Balanza', icon: Scale },
  { value: 'Building2', label: 'Edificio', icon: Building2 },
  { value: 'Receipt', label: 'Recibo', icon: Receipt },
  { value: 'Landmark', label: 'Institución', icon: Landmark },
  { value: 'Shield', label: 'Escudo', icon: Shield },
];

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'laboral', label: 'Laboral' },
  { value: 'civil', label: 'Civil' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'tributario', label: 'Tributario' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'penal', label: 'Penal' },
  { value: 'familia', label: 'Familia' },
];

const COLOR_OPTIONS = [
  { value: 'bg-blue-500', label: 'Azul' },
  { value: 'bg-amber-500', label: 'Ámbar' },
  { value: 'bg-green-500', label: 'Verde' },
  { value: 'bg-purple-500', label: 'Púrpura' },
  { value: 'bg-red-500', label: 'Rojo' },
  { value: 'bg-slate-500', label: 'Gris' },
  { value: 'bg-pink-500', label: 'Rosa' },
  { value: 'bg-cyan-500', label: 'Cian' },
];

const emptyAgent: Partial<SpecializedAgent> = {
  name: '',
  description: '',
  short_description: '',
  category: 'general',
  target_audience: 'ambos',
  icon: 'Bot',
  color_class: 'bg-blue-500',
  openai_workflow_id: '',
  openai_assistant_id: '',
  agent_instructions: '',
  credits_per_session: 1,
  max_messages_per_session: 50,
  is_premium: false,
  requires_subscription: null,
  status: 'draft',
  display_order: 0,
  is_featured: false,
};

export const AdminSpecializedAgents = () => {
  const [agents, setAgents] = useState<SpecializedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Partial<SpecializedAgent> | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('specialized_agents_catalog')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los agentes especializados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreateNew = () => {
    setEditingAgent({ ...emptyAgent });
    setIsDialogOpen(true);
  };

  const handleEdit = (agent: SpecializedAgent) => {
    setEditingAgent({ ...agent });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingAgent?.name) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      if (editingAgent.id) {
        // Update existing
        const { error } = await supabase
          .from('specialized_agents_catalog')
          .update({
            name: editingAgent.name,
            description: editingAgent.description,
            short_description: editingAgent.short_description,
            category: editingAgent.category,
            target_audience: editingAgent.target_audience,
            icon: editingAgent.icon,
            color_class: editingAgent.color_class,
            openai_workflow_id: editingAgent.openai_workflow_id || null,
            openai_assistant_id: editingAgent.openai_assistant_id || null,
            agent_instructions: editingAgent.agent_instructions,
            credits_per_session: editingAgent.credits_per_session,
            max_messages_per_session: editingAgent.max_messages_per_session,
            is_premium: editingAgent.is_premium,
            requires_subscription: editingAgent.requires_subscription,
            status: editingAgent.status,
            display_order: editingAgent.display_order,
            is_featured: editingAgent.is_featured,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAgent.id);

        if (error) throw error;
        toast({ title: "Éxito", description: "Agente actualizado correctamente" });
      } else {
        // Create new
        const { error } = await supabase
          .from('specialized_agents_catalog')
          .insert({
            name: editingAgent.name,
            description: editingAgent.description,
            short_description: editingAgent.short_description,
            category: editingAgent.category,
            target_audience: editingAgent.target_audience,
            icon: editingAgent.icon,
            color_class: editingAgent.color_class,
            openai_workflow_id: editingAgent.openai_workflow_id || null,
            openai_assistant_id: editingAgent.openai_assistant_id || null,
            agent_instructions: editingAgent.agent_instructions,
            credits_per_session: editingAgent.credits_per_session,
            max_messages_per_session: editingAgent.max_messages_per_session,
            is_premium: editingAgent.is_premium,
            requires_subscription: editingAgent.requires_subscription,
            status: editingAgent.status,
            display_order: editingAgent.display_order,
            is_featured: editingAgent.is_featured,
          });

        if (error) throw error;
        toast({ title: "Éxito", description: "Agente creado correctamente" });
      }

      setIsDialogOpen(false);
      setEditingAgent(null);
      fetchAgents();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el agente",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este agente?')) return;

    try {
      const { error } = await supabase
        .from('specialized_agents_catalog')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Éxito", description: "Agente eliminado" });
      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el agente",
        variant: "destructive"
      });
    }
  };

  const handleToggleStatus = async (agent: SpecializedAgent) => {
    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('specialized_agents_catalog')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', agent.id);

      if (error) throw error;
      fetchAgents();
      toast({ 
        title: "Estado actualizado", 
        description: `Agente ${newStatus === 'active' ? 'activado' : 'desactivado'}` 
      });
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      draft: 'bg-yellow-100 text-yellow-800',
    };
    const labels: Record<string, string> = {
      active: 'Activo',
      inactive: 'Inactivo',
      draft: 'Borrador',
    };
    return <Badge className={styles[status] || styles.draft}>{labels[status] || status}</Badge>;
  };

  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    totalUsage: agents.reduce((sum, a) => sum + (a.usage_count || 0), 0),
    featured: agents.filter(a => a.is_featured).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Agentes Especializados</h2>
          <p className="text-muted-foreground">
            Gestiona los agentes IA especializados para abogados (OpenAI Agent Builder)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAgents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Agente
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Agentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalUsage}</p>
                <p className="text-xs text-muted-foreground">Sesiones Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats.featured}</p>
                <p className="text-xs text-muted-foreground">Destacados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-blue-900">Integración con OpenAI Agent Builder</p>
              <p className="text-sm text-blue-700">
                Crea workflows en{" "}
                <a 
                  href="https://platform.openai.com/playground/agents" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  platform.openai.com/playground/agents
                </a>
                {" "}y pega el Workflow ID o Assistant ID aquí.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Agentes</CardTitle>
          <CardDescription>
            Lista de agentes especializados disponibles para los abogados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay agentes especializados configurados</p>
              <Button onClick={handleCreateNew} variant="link">
                Crear el primero
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agente</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>OpenAI ID</TableHead>
                  <TableHead className="text-center">Créditos</TableHead>
                  <TableHead className="text-center">Uso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${agent.color_class} text-white`}>
                          <Bot className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{agent.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {agent.short_description}
                          </p>
                        </div>
                        {agent.is_featured && (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {agent.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(agent.status)}</TableCell>
                    <TableCell>
                      {agent.openai_workflow_id || agent.openai_assistant_id ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {(agent.openai_workflow_id || agent.openai_assistant_id || '').substring(0, 12)}...
                        </code>
                      ) : (
                        <span className="text-muted-foreground text-xs">No configurado</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{agent.credits_per_session}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{agent.usage_count}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(agent)}
                          title={agent.status === 'active' ? 'Desactivar' : 'Activar'}
                        >
                          <Eye className={`h-4 w-4 ${agent.status === 'active' ? 'text-green-600' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(agent)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(agent.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAgent?.id ? 'Editar Agente' : 'Nuevo Agente Especializado'}
            </DialogTitle>
            <DialogDescription>
              Configura los detalles del agente IA especializado
            </DialogDescription>
          </DialogHeader>

          {editingAgent && (
            <Tabs defaultValue="basic" className="mt-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="openai">OpenAI</TabsTrigger>
                <TabsTrigger value="config">Configuración</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={editingAgent.name || ''}
                      onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                      placeholder="Ej: Asesor Laboral"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select
                      value={editingAgent.category || 'general'}
                      onValueChange={(v) => setEditingAgent({ ...editingAgent, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descripción corta</Label>
                  <Input
                    value={editingAgent.short_description || ''}
                    onChange={(e) => setEditingAgent({ ...editingAgent, short_description: e.target.value })}
                    placeholder="Breve descripción para tarjetas"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descripción completa</Label>
                  <Textarea
                    value={editingAgent.description || ''}
                    onChange={(e) => setEditingAgent({ ...editingAgent, description: e.target.value })}
                    placeholder="Descripción detallada del agente y sus capacidades"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Audiencia</Label>
                    <Select
                      value={editingAgent.target_audience || 'ambos'}
                      onValueChange={(v) => setEditingAgent({ ...editingAgent, target_audience: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personas">Personas</SelectItem>
                        <SelectItem value="empresas">Empresas</SelectItem>
                        <SelectItem value="ambos">Ambos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ícono</Label>
                    <Select
                      value={editingAgent.icon || 'Bot'}
                      onValueChange={(v) => setEditingAgent({ ...editingAgent, icon: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <opt.icon className="h-4 w-4" />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Select
                      value={editingAgent.color_class || 'bg-blue-500'}
                      onValueChange={(v) => setEditingAgent({ ...editingAgent, color_class: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOR_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded ${opt.value}`} />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="openai" className="space-y-4 mt-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Integración con OpenAI</p>
                  <p className="text-xs text-muted-foreground">
                    Puedes usar un Workflow ID de Agent Builder o un Assistant ID de la API de Assistants.
                    Si ambos están configurados, se usará el Workflow ID.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>OpenAI Workflow ID</Label>
                  <Input
                    value={editingAgent.openai_workflow_id || ''}
                    onChange={(e) => setEditingAgent({ ...editingAgent, openai_workflow_id: e.target.value })}
                    placeholder="workflow_xxx... (de Agent Builder)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>OpenAI Assistant ID (alternativo)</Label>
                  <Input
                    value={editingAgent.openai_assistant_id || ''}
                    onChange={(e) => setEditingAgent({ ...editingAgent, openai_assistant_id: e.target.value })}
                    placeholder="asst_xxx... (de Assistants API)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Instrucciones del Agente (System Prompt)</Label>
                  <Textarea
                    value={editingAgent.agent_instructions || ''}
                    onChange={(e) => setEditingAgent({ ...editingAgent, agent_instructions: e.target.value })}
                    placeholder="Instrucciones detalladas para el comportamiento del agente..."
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Estas instrucciones se usarán si no hay Workflow/Assistant ID configurado
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="config" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Créditos por sesión</Label>
                    <Input
                      type="number"
                      min={0}
                      value={editingAgent.credits_per_session || 1}
                      onChange={(e) => setEditingAgent({ ...editingAgent, credits_per_session: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Máx. mensajes por sesión</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingAgent.max_messages_per_session || 50}
                      onChange={(e) => setEditingAgent({ ...editingAgent, max_messages_per_session: parseInt(e.target.value) || 50 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={editingAgent.status || 'draft'}
                      onValueChange={(v) => setEditingAgent({ ...editingAgent, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Orden de visualización</Label>
                    <Input
                      type="number"
                      min={0}
                      value={editingAgent.display_order || 0}
                      onChange={(e) => setEditingAgent({ ...editingAgent, display_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Suscripción requerida</Label>
                  <Select
                    value={editingAgent.requires_subscription || 'none'}
                    onValueChange={(v) => setEditingAgent({ ...editingAgent, requires_subscription: v === 'none' ? null : v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguna (gratuito)</SelectItem>
                      <SelectItem value="basico">Plan Básico</SelectItem>
                      <SelectItem value="profesional">Plan Profesional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div>
                    <Label>Agente Premium</Label>
                    <p className="text-xs text-muted-foreground">Marcar como agente premium/destacado</p>
                  </div>
                  <Switch
                    checked={editingAgent.is_premium || false}
                    onCheckedChange={(v) => setEditingAgent({ ...editingAgent, is_premium: v })}
                  />
                </div>

                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div>
                    <Label>Destacar en catálogo</Label>
                    <p className="text-xs text-muted-foreground">Mostrar con estrella y prioridad visual</p>
                  </div>
                  <Switch
                    checked={editingAgent.is_featured || false}
                    onCheckedChange={(v) => setEditingAgent({ ...editingAgent, is_featured: v })}
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSpecializedAgents;
