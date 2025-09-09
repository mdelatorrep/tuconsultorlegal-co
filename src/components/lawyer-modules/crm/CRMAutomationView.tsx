import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, Trash2, Zap, Play, Pause, Settings2, Clock, Mail, MessageSquare, Bell, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  trigger_event: string;
  trigger_conditions: any;
  actions: any;
  is_active: boolean;
  execution_count: number;
  last_execution?: string;
  created_at: string;
}

interface CRMAutomationViewProps {
  lawyerData: any;
  searchTerm: string;
  onRefresh: () => void;
}

const CRMAutomationView: React.FC<CRMAutomationViewProps> = ({ lawyerData, searchTerm, onRefresh }) => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_event: '',
    trigger_conditions: {},
    actions: [] as any[],
    is_active: true
  });
  const [currentAction, setCurrentAction] = useState({
    type: '',
    config: {}
  });
  const { toast } = useToast();

  useEffect(() => {
    if (lawyerData?.id) {
      fetchRules();
    }
  }, [lawyerData?.id]);

  const fetchRules = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('crm_automation_rules')
        .select('*')
        .eq('lawyer_id', lawyerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error fetching automation rules:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las reglas de automatización",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRules = rules.filter(rule =>
    rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.trigger_event.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveRule = async () => {
    try {
      const ruleData = {
        ...formData,
        lawyer_id: lawyerData.id
      };

      if (editingRule) {
        const { error } = await supabase
          .from('crm_automation_rules')
          .update(ruleData)
          .eq('id', editingRule.id);

        if (error) throw error;
        toast({
          title: "Regla actualizada",
          description: "La regla de automatización se ha actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from('crm_automation_rules')
          .insert([ruleData]);

        if (error) throw error;
        toast({
          title: "Regla creada",
          description: "La nueva regla de automatización se ha creado correctamente",
        });
      }

      setIsDialogOpen(false);
      setEditingRule(null);
      resetForm();
      fetchRules();
      onRefresh();
    } catch (error) {
      console.error('Error saving automation rule:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la regla de automatización",
        variant: "destructive",
      });
    }
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('crm_automation_rules')
        .update({ is_active: !isActive })
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: isActive ? "Regla desactivada" : "Regla activada",
        description: `La regla ha sido ${isActive ? 'desactivada' : 'activada'} correctamente`,
      });

      fetchRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado de la regla",
        variant: "destructive",
      });
    }
  };

  const handleEditRule = (rule: AutomationRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      trigger_event: rule.trigger_event,
      trigger_conditions: rule.trigger_conditions,
      actions: rule.actions,
      is_active: rule.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta regla?')) return;

    try {
      const { error } = await supabase
        .from('crm_automation_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: "Regla eliminada",
        description: "La regla de automatización se ha eliminado correctamente",
      });

      fetchRules();
      onRefresh();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la regla",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      trigger_event: '',
      trigger_conditions: {},
      actions: [],
      is_active: true
    });
    setCurrentAction({
      type: '',
      config: {}
    });
  };

  const handleAddAction = () => {
    if (currentAction.type) {
      setFormData({
        ...formData,
        actions: [...formData.actions, currentAction]
      });
      setCurrentAction({ type: '', config: {} });
    }
  };

  const handleRemoveAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index)
    });
  };

  const getTriggerIcon = (event: string) => {
    switch (event) {
      case 'client_created': return <Plus className="h-4 w-4" />;
      case 'case_status_changed': return <Settings2 className="h-4 w-4" />;
      case 'communication_sent': return <Mail className="h-4 w-4" />;
      case 'task_due': return <Clock className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'send_email': return <Mail className="h-4 w-4" />;
      case 'send_sms': return <MessageSquare className="h-4 w-4" />;
      case 'create_task': return <Calendar className="h-4 w-4" />;
      case 'send_notification': return <Bell className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getTriggerText = (event: string) => {
    switch (event) {
      case 'client_created': return 'Cliente creado';
      case 'case_status_changed': return 'Estado de caso cambiado';
      case 'communication_sent': return 'Comunicación enviada';
      case 'task_due': return 'Tarea vencida';
      default: return event;
    }
  };

  const getActionText = (type: string) => {
    switch (type) {
      case 'send_email': return 'Enviar email';
      case 'send_sms': return 'Enviar SMS';
      case 'create_task': return 'Crear tarea';
      case 'send_notification': return 'Enviar notificación';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Automatización de Flujos</h2>
          <p className="text-sm text-muted-foreground">
            Configura reglas para automatizar tareas repetitivas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingRule(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Regla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Editar Regla' : 'Nueva Regla de Automatización'}
              </DialogTitle>
              <DialogDescription>
                {editingRule ? 'Modifica la regla de automatización' : 'Crea una nueva regla para automatizar tareas'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Nombre de la Regla *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Bienvenida a nuevos clientes"
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción de lo que hace esta regla"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="trigger_event">Evento Disparador *</Label>
                <Select
                  value={formData.trigger_event}
                  onValueChange={(value) => setFormData({ ...formData, trigger_event: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un evento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client_created">Cliente creado</SelectItem>
                    <SelectItem value="case_status_changed">Estado de caso cambiado</SelectItem>
                    <SelectItem value="communication_sent">Comunicación enviada</SelectItem>
                    <SelectItem value="task_due">Tarea vencida</SelectItem>
                    <SelectItem value="document_uploaded">Documento subido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Regla activa</Label>
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label>Acciones a Ejecutar</Label>
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={currentAction.type}
                      onValueChange={(value) => setCurrentAction({ ...currentAction, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo de acción" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="send_email">Enviar email</SelectItem>
                        <SelectItem value="send_sms">Enviar SMS</SelectItem>
                        <SelectItem value="create_task">Crear tarea</SelectItem>
                        <SelectItem value="send_notification">Enviar notificación</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Configuración (JSON)"
                      value={JSON.stringify(currentAction.config)}
                      onChange={(e) => {
                        try {
                          const config = JSON.parse(e.target.value || '{}');
                          setCurrentAction({ ...currentAction, config });
                        } catch (error) {
                          // Invalid JSON, ignore
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddAction} variant="outline">
                      Agregar
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {formData.actions.map((action, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          {getActionIcon(action.type)}
                          <span>{getActionText(action.type)}</span>
                          <Badge variant="outline">{JSON.stringify(action.config)}</Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAction(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveRule}>
                {editingRule ? 'Actualizar' : 'Crear'} Regla
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Automation Rules */}
      <div className="grid gap-4">
        {filteredRules.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron reglas que coincidan con la búsqueda' : 'No tienes reglas de automatización configuradas aún'}
              </p>
              {!searchTerm && (
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera regla
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredRules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getTriggerIcon(rule.trigger_event)}
                      <h3 className="font-semibold">{rule.name}</h3>
                      <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                        {rule.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground mb-2">
                      <p><strong>Disparador:</strong> {getTriggerText(rule.trigger_event)}</p>
                      <p><strong>Acciones:</strong> {rule.actions.length} configuradas</p>
                      <p><strong>Ejecutada:</strong> {rule.execution_count} veces</p>
                      {rule.last_execution && (
                        <p><strong>Última ejecución:</strong> {format(new Date(rule.last_execution), 'dd MMM yyyy HH:mm', { locale: es })}</p>
                      )}
                    </div>
                    
                    {rule.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {rule.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-1">
                      {rule.actions.map((action, index) => (
                        <div key={index} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                          {getActionIcon(action.type)}
                          <span>{getActionText(action.type)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleRule(rule.id, rule.is_active)}
                    >
                      {rule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditRule(rule)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CRMAutomationView;