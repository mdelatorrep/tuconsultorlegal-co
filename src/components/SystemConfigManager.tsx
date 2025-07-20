import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit3, Trash2, Settings, Save, X } from "lucide-react";
import { Label } from "@/components/ui/label";

interface SystemConfig {
  id: string;
  config_key: string;
  config_value: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export default function SystemConfigManager() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [configForm, setConfigForm] = useState({
    config_key: "",
    config_value: "",
    description: ""
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .order('config_key');

      if (error) throw error;
      setConfigs(data || []);
    } catch (error: any) {
      console.error('Error loading configs:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las configuraciones del sistema",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (config?: SystemConfig) => {
    if (config) {
      setEditingConfig(config);
      setConfigForm({
        config_key: config.config_key,
        config_value: config.config_value,
        description: config.description || ""
      });
    } else {
      setEditingConfig(null);
      setConfigForm({
        config_key: "",
        config_value: "",
        description: ""
      });
    }
    setShowEditor(true);
  };

  const saveConfig = async () => {
    if (!configForm.config_key.trim() || !configForm.config_value.trim()) {
      toast({
        title: "Error",
        description: "La clave y el valor son requeridos",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-system-config', {
        body: configForm
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Error al guardar la configuración');
      }

      toast({
        title: "Éxito",
        description: editingConfig ? "Configuración actualizada exitosamente" : "Configuración creada exitosamente"
      });

      setShowEditor(false);
      setEditingConfig(null);
      setConfigForm({
        config_key: "",
        config_value: "",
        description: ""
      });
      await loadConfigs();
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar la configuración",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteConfig = async (configKey: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la configuración "${configKey}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('system_config')
        .delete()
        .eq('config_key', configKey);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Configuración eliminada exitosamente"
      });

      await loadConfigs();
    } catch (error: any) {
      console.error('Error deleting config:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar la configuración",
        variant: "destructive"
      });
    }
  };

  const getConfigTypeBadge = (key: string) => {
    if (key.includes('email') || key.includes('smtp')) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-800">Email</Badge>;
    }
    if (key.includes('api') || key.includes('key')) {
      return <Badge variant="outline" className="bg-purple-50 text-purple-800">API</Badge>;
    }
    if (key.includes('url') || key.includes('endpoint')) {
      return <Badge variant="outline" className="bg-green-50 text-green-800">URL</Badge>;
    }
    if (key.includes('feature') || key.includes('enable')) {
      return <Badge variant="outline" className="bg-orange-50 text-orange-800">Feature</Badge>;
    }
    return <Badge variant="secondary">Config</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando configuraciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Configuración del Sistema
          </h2>
          <p className="text-muted-foreground">
            Gestiona configuraciones globales del sistema
          </p>
        </div>
        <Dialog open={showEditor} onOpenChange={setShowEditor}>
          <DialogTrigger asChild>
            <Button onClick={() => openEditor()}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Configuración
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? 'Editar Configuración' : 'Nueva Configuración'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="config_key">Clave de Configuración</Label>
                <Input
                  id="config_key"
                  value={configForm.config_key}
                  onChange={(e) => setConfigForm({ ...configForm, config_key: e.target.value })}
                  placeholder="ej: smtp_host, api_endpoint, feature_enabled"
                  disabled={!!editingConfig}
                />
              </div>
              
              <div>
                <Label htmlFor="config_value">Valor</Label>
                <Textarea
                  id="config_value"
                  value={configForm.config_value}
                  onChange={(e) => setConfigForm({ ...configForm, config_value: e.target.value })}
                  placeholder="Valor de la configuración"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  value={configForm.description}
                  onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                  placeholder="Descripción de para qué sirve esta configuración"
                  rows={2}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={saveConfig} disabled={saving} className="flex-1">
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowEditor(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Configs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configuraciones del Sistema ({configs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay configuraciones</h3>
              <p className="text-muted-foreground mb-4">
                Comienza creando tu primera configuración del sistema
              </p>
              <Button onClick={() => openEditor()}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Configuración
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clave</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">Valor</TableHead>
                    <TableHead className="hidden lg:table-cell">Descripción</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">
                        <code className="text-sm bg-muted px-1 py-0.5 rounded">
                          {config.config_key}
                        </code>
                      </TableCell>
                      <TableCell>
                        {getConfigTypeBadge(config.config_key)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs">
                        <div className="truncate" title={config.config_value}>
                          {config.config_value.length > 50 
                            ? `${config.config_value.substring(0, 50)}...` 
                            : config.config_value
                          }
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-sm">
                        <div className="truncate" title={config.description}>
                          {config.description || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditor(config)}
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteConfig(config.config_key)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}