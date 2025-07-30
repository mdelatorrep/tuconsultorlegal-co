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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit3, Trash2, Settings, Save, X, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";

interface SystemConfig {
  id: string;
  config_key: string;
  config_value: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface ConfigCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  configs: ConfigTemplate[];
}

interface ConfigTemplate {
  key: string;
  name: string;
  description: string;
  defaultValue: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  options?: string[];
  placeholder?: string;
}

export default function SystemConfigManager() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('legal-tools');
  const [openaiModels, setOpenaiModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const { toast } = useToast();

  const [configForm, setConfigForm] = useState({
    config_key: "",
    config_value: "",
    description: ""
  });

  // Definir categorías de configuración
  const configCategories: ConfigCategory[] = [
    {
      id: 'legal-tools',
      name: 'Herramientas Legales',
      description: 'Configuraciones para módulos de investigación, análisis, redacción y estrategia',
      icon: 'Scale',
      configs: [
        {
          key: 'research_ai_model',
          name: 'Modelo IA para Investigación',
          description: 'Modelo de IA utilizado para el módulo de investigación legal',
          defaultValue: 'gpt-4.1-2025-04-14',
          type: 'select',
          options: [] // Se cargarán dinámicamente desde OpenAI
        },
        {
          key: 'research_system_prompt',
          name: 'Prompt del Sistema - Investigación',
          description: 'Prompt base para el sistema de investigación legal',
          defaultValue: 'Eres un asistente especializado en investigación jurídica. Proporciona análisis detallados y citas precisas de legislación relevante.',
          type: 'textarea'
        },
        {
          key: 'analysis_ai_model',
          name: 'Modelo IA para Análisis',
          description: 'Modelo de IA utilizado para el módulo de análisis legal',
          defaultValue: 'gpt-4.1-2025-04-14',
          type: 'select',
          options: []
        },
        {
          key: 'analysis_system_prompt',
          name: 'Prompt del Sistema - Análisis',
          description: 'Prompt base para el sistema de análisis legal',
          defaultValue: 'Eres un experto en análisis jurídico. Evalúa documentos legales con precisión y proporciona recomendaciones estratégicas.',
          type: 'textarea'
        },
        {
          key: 'drafting_ai_model',
          name: 'Modelo IA para Redacción',
          description: 'Modelo de IA utilizado para el módulo de redacción legal',
          defaultValue: 'gpt-4.1-2025-04-14',
          type: 'select',
          options: []
        },
        {
          key: 'drafting_system_prompt',
          name: 'Prompt del Sistema - Redacción',
          description: 'Prompt base para el sistema de redacción legal',
          defaultValue: 'Eres un redactor jurídico experto. Crea documentos legales precisos, claros y conformes a la legislación vigente.',
          type: 'textarea'
        },
        {
          key: 'strategy_ai_model',
          name: 'Modelo IA para Estrategia',
          description: 'Modelo de IA utilizado para el módulo de estrategia legal',
          defaultValue: 'o3-2025-04-16',
          type: 'select',
          options: []
        },
        {
          key: 'strategy_system_prompt',
          name: 'Prompt del Sistema - Estrategia',
          description: 'Prompt base para el sistema de estrategia legal',
          defaultValue: 'Eres un estratega jurídico senior. Desarrolla estrategias legales comprehensivas considerando todos los aspectos del caso.',
          type: 'textarea'
        }
      ]
    },
    {
      id: 'ai-management',
      name: 'Gestión IA',
      description: 'Configuraciones para creación y optimización de agentes IA',
      icon: 'Brain',
      configs: [
        {
          key: 'agent_creation_ai_model',
          name: 'Modelo IA para Creación de Agentes',
          description: 'Modelo utilizado para generar y optimizar agentes legales',
          defaultValue: 'gpt-4.1-2025-04-14',
          type: 'select',
          options: []
        },
        {
          key: 'agent_creation_system_prompt',
          name: 'Prompt para Creación de Agentes',
          description: 'Prompt utilizado para generar nuevos agentes legales',
          defaultValue: 'Eres un experto en creación de agentes legales especializados. Genera prompts, plantillas y configuraciones optimizadas.',
          type: 'textarea'
        },
        {
          key: 'document_description_optimizer_model',
          name: 'Modelo IA para Optimizar Descripciones',
          description: 'Modelo utilizado para optimizar descripciones de documentos',
          defaultValue: 'gpt-4.1-2025-04-14',
          type: 'select',
          options: []
        },
        {
          key: 'document_description_optimizer_prompt',
          name: 'Prompt para Optimizar Descripciones',
          description: 'Prompt para mejorar descripciones de documentos legales',
          defaultValue: 'Optimiza la descripción del documento legal para que sea clara, precisa y atractiva para el usuario final.',
          type: 'textarea'
        },
        {
          key: 'template_optimizer_model',
          name: 'Modelo IA para Optimizar Plantillas',
          description: 'Modelo utilizado para optimizar plantillas de documentos',
          defaultValue: 'gpt-4.1-2025-04-14',
          type: 'select',
          options: []
        },
        {
          key: 'template_optimizer_prompt',
          name: 'Prompt para Optimizar Plantillas',
          description: 'Prompt para mejorar plantillas de documentos legales',
          defaultValue: 'Optimiza la plantilla del documento legal para que sea completa, precisa y fácil de completar.',
          type: 'textarea'
        },
        {
          key: 'content_optimization_model',
          name: 'Modelo IA para Optimización General',
          description: 'Modelo para optimización general de contenidos',
          defaultValue: 'gpt-4.1-2025-04-14',
          type: 'select',
          options: []
        }
      ]
    },
    {
      id: 'system-general',
      name: 'Configuración General',
      description: 'Configuraciones generales del sistema y APIs',
      icon: 'Settings',
      configs: [
        {
          key: 'openai_api_timeout',
          name: 'Timeout API OpenAI (segundos)',
          description: 'Tiempo límite para requests a la API de OpenAI',
          defaultValue: '30',
          type: 'number'
        },
        {
          key: 'max_retries_ai_requests',
          name: 'Máximo de Reintentos IA',
          description: 'Número máximo de reintentos para requests fallidos a IA',
          defaultValue: '3',
          type: 'number'
        },
        {
          key: 'default_sla_hours',
          name: 'SLA por Defecto (horas)',
          description: 'Tiempo de SLA por defecto para documentos legales',
          defaultValue: '4',
          type: 'number'
        }
      ]
    }
  ];

  useEffect(() => {
    loadConfigs();
    // No cargar modelos automáticamente - solo por demanda del admin
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

  const loadOpenAIModels = async () => {
    try {
      setLoadingModels(true);
      const { data, error } = await supabase.functions.invoke('get-openai-models');
      
      if (error) {
        console.error('Error loading OpenAI models:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los modelos de OpenAI: " + (error.message || 'Error desconocido'),
          variant: "destructive"
        });
        return;
      }

      if (data?.success && data?.models) {
        const modelIds = data.models.map((model: any) => model.id);
        setOpenaiModels(modelIds);
        toast({
          title: "Éxito",
          description: `Se cargaron ${modelIds.length} modelos de OpenAI`
        });
      } else {
        console.error('Invalid response from get-openai-models:', data);
        toast({
          title: "Error",
          description: data?.error || "No se pudieron cargar los modelos de OpenAI",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error loading OpenAI models:', error);
      toast({
        title: "Error",
        description: "Error al cargar modelos: " + (error.message || 'Error desconocido'),
        variant: "destructive"
      });
    } finally {
      setLoadingModels(false);
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
    if (key.includes('model') || key.includes('ai_')) {
      return <Badge variant="outline" className="bg-purple-50 text-purple-800">IA Model</Badge>;
    }
    if (key.includes('prompt') || key.includes('system_')) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-800">Prompt</Badge>;
    }
    if (key.includes('research') || key.includes('analysis')) {
      return <Badge variant="outline" className="bg-green-50 text-green-800">Legal Tool</Badge>;
    }
    if (key.includes('timeout') || key.includes('retry') || key.includes('sla')) {
      return <Badge variant="outline" className="bg-orange-50 text-orange-800">System</Badge>;
    }
    return <Badge variant="secondary">Config</Badge>;
  };

  const getCurrentCategoryConfigs = () => {
    const category = configCategories.find(cat => cat.id === selectedCategory);
    if (!category) return [];
    
    return category.configs.map(template => {
      const existingConfig = configs.find(config => config.config_key === template.key);
      return {
        template,
        config: existingConfig,
        value: existingConfig?.config_value || template.defaultValue
      };
    });
  };

  const openEditorWithTemplate = (template: ConfigTemplate) => {
    const existingConfig = configs.find(config => config.config_key === template.key);
    
    if (existingConfig) {
      setEditingConfig(existingConfig);
      setConfigForm({
        config_key: existingConfig.config_key,
        config_value: existingConfig.config_value,
        description: existingConfig.description || template.description
      });
    } else {
      setEditingConfig(null);
      setConfigForm({
        config_key: template.key,
        config_value: template.defaultValue,
        description: template.description
      });
    }
    setShowEditor(true);
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
            Gestiona configuraciones de IA y herramientas legales
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
                <Label htmlFor="config_value">
                  Valor
                  {(configForm.config_key.includes('model') && (configForm.config_key.includes('ai') || configForm.config_key.includes('openai'))) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={loadOpenAIModels}
                      disabled={loadingModels}
                      className="ml-2 h-6 text-xs"
                    >
                      {loadingModels ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      {loadingModels ? 'Cargando...' : 'Actualizar modelos'}
                    </Button>
                  )}
                </Label>
                
                {(configForm.config_key.includes('model') && (configForm.config_key.includes('ai') || configForm.config_key.includes('openai'))) ? (
                  <Select
                    value={configForm.config_value}
                    onValueChange={(value) => setConfigForm({ ...configForm, config_value: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un modelo de OpenAI" />
                    </SelectTrigger>
                     <SelectContent>
                       {openaiModels.length > 0 ? (
                         openaiModels.map((model) => (
                           <SelectItem key={model} value={model}>
                             {model}
                           </SelectItem>
                         ))
                       ) : (
                         <SelectItem value="no-models-loaded" disabled>
                           {loadingModels ? 'Cargando modelos...' : 'Haz clic en "Actualizar modelos" para cargar'}
                         </SelectItem>
                       )}
                     </SelectContent>
                  </Select>
                ) : configForm.config_key.includes('prompt') || configForm.config_key.includes('system') ? (
                  <Textarea
                    id="config_value"
                    value={configForm.config_value}
                    onChange={(e) => setConfigForm({ ...configForm, config_value: e.target.value })}
                    placeholder="Valor de la configuración"
                    rows={6}
                  />
                ) : (
                  <Input
                    id="config_value"
                    value={configForm.config_value}
                    onChange={(e) => setConfigForm({ ...configForm, config_value: e.target.value })}
                    placeholder="Valor de la configuración"
                    type={configForm.config_key.includes('timeout') || configForm.config_key.includes('sla') || configForm.config_key.includes('retry') ? 'number' : 'text'}
                  />
                )}
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

      {/* Categories Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {configCategories.map((category) => (
          <Card
            key={category.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedCategory === category.id 
                ? 'ring-2 ring-primary bg-primary/5' 
                : 'hover:bg-muted/50'
            }`}
            onClick={() => setSelectedCategory(category.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  {category.icon === 'Scale' && <span className="text-primary">⚖️</span>}
                  {category.icon === 'Brain' && <span className="text-primary">🧠</span>}
                  {category.icon === 'Settings' && <Settings className="w-4 h-4 text-primary" />}
                </div>
                <h3 className="font-semibold">{category.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{category.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {category.configs.length} configuraciones
                </Badge>
                {selectedCategory === category.id && (
                  <Badge variant="default" className="text-xs">Activa</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current Category Configs */}
      <Card>
        <CardHeader>
          <CardTitle>
            {configCategories.find(cat => cat.id === selectedCategory)?.name || 'Configuraciones'}
            ({getCurrentCategoryConfigs().length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getCurrentCategoryConfigs().length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay configuraciones en esta categoría</h3>
              <p className="text-muted-foreground mb-4">
                Las configuraciones aparecerán aquí una vez que las crees
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {getCurrentCategoryConfigs().map(({ template, config, value }) => (
                <div key={template.key} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{template.name}</h4>
                        {getConfigTypeBadge(template.key)}
                        {config && <Badge variant="outline" className="text-xs">Configurado</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {template.key}
                      </code>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant={config ? "outline" : "default"}
                        onClick={() => openEditorWithTemplate(template)}
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        {config ? 'Editar' : 'Configurar'}
                      </Button>
                      {config && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteConfig(template.key)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 rounded p-3">
                    <div className="text-xs text-muted-foreground mb-1">Valor actual:</div>
                    <div className="text-sm font-mono">
                      {template.type === 'textarea' ? (
                        <div className="max-h-20 overflow-y-auto">
                          {value.length > 100 ? `${value.substring(0, 100)}...` : value}
                        </div>
                      ) : (
                        <span>{value}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}