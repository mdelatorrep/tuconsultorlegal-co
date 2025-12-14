import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { 
  Settings, 
  RefreshCw, 
  Bot, 
  FileText, 
  Scale, 
  MessageSquare, 
  Wrench,
  Sparkles,
  Save,
  Plus
} from "lucide-react";
import AIFunctionConfig from "./admin/AIFunctionConfig";

interface SystemConfig {
  id: string;
  config_key: string;
  config_value: string;
  description?: string;
}

interface AIFunction {
  id: string;
  name: string;
  description: string;
  promptKey: string;
  modelKey?: string;
  additionalParams?: { key: string; name: string; type: 'text' | 'number' }[];
  colorClass: string;
}

interface FunctionCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  functions: AIFunction[];
}

export default function SystemConfigManager() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [openaiModels, setOpenaiModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('agent-functions');
  const [showGlobalParams, setShowGlobalParams] = useState(false);
  const { toast } = useToast();

  // Define function categories
  const functionCategories: FunctionCategory[] = [
    {
      id: 'agent-functions',
      name: 'Funciones de Agentes',
      description: 'Creación y gestión de agentes IA para documentos legales',
      icon: <Bot className="w-5 h-5" />,
      functions: [
        {
          id: 'improve_clause',
          name: 'Mejorar Cláusulas',
          description: 'Optimiza cláusulas legales en plantillas de documentos',
          promptKey: 'improve_clause_ai_prompt',
          modelKey: 'content_optimization_model',
          colorClass: 'border-l-purple-500'
        },
        {
          id: 'suggest_blocks',
          name: 'Sugerir Bloques de Conversación',
          description: 'Genera bloques de conversación para agentes de documentos',
          promptKey: 'suggest_conversation_blocks_prompt',
          modelKey: 'content_optimization_model',
          colorClass: 'border-l-purple-500'
        },
        {
          id: 'agent_creation',
          name: 'Creación de Agentes',
          description: 'Genera y optimiza configuraciones de agentes legales',
          promptKey: 'agent_creation_system_prompt',
          modelKey: 'agent_creation_ai_model',
          colorClass: 'border-l-purple-500'
        }
      ]
    },
    {
      id: 'document-functions',
      name: 'Funciones de Documentos',
      description: 'Generación y procesamiento de documentos legales',
      icon: <FileText className="w-5 h-5" />,
      functions: [
        {
          id: 'document_chat',
          name: 'Chat de Documentos',
          description: 'Recopila información del usuario para generar documentos',
          promptKey: 'document_chat_prompt',
          modelKey: 'document_chat_ai_model',
          colorClass: 'border-l-blue-500'
        },
        {
          id: 'generate_document',
          name: 'Generar Documento',
          description: 'Genera el documento final desde datos recopilados',
          promptKey: 'generate_document_prompt',
          modelKey: 'openai_assistant_model',
          additionalParams: [
            { key: 'openai_assistant_temperature', name: 'Temperatura', type: 'number' as const }
          ],
          colorClass: 'border-l-blue-500'
        }
      ]
    },
    {
      id: 'legal-tools',
      name: 'Herramientas Legales',
      description: 'Módulos de investigación, análisis, redacción y estrategia',
      icon: <Scale className="w-5 h-5" />,
      functions: [
        {
          id: 'research',
          name: 'Investigación Legal',
          description: 'Análisis de legislación y jurisprudencia',
          promptKey: 'research_system_prompt',
          modelKey: 'research_ai_model',
          colorClass: 'border-l-green-500'
        },
        {
          id: 'analysis',
          name: 'Análisis de Documentos',
          description: 'Evaluación y análisis de documentos legales',
          promptKey: 'analysis_system_prompt',
          modelKey: 'analysis_ai_model',
          colorClass: 'border-l-green-500'
        },
        {
          id: 'drafting',
          name: 'Redacción Legal',
          description: 'Creación de documentos legales profesionales',
          promptKey: 'drafting_system_prompt',
          modelKey: 'drafting_ai_model',
          colorClass: 'border-l-green-500'
        },
        {
          id: 'strategy',
          name: 'Estrategia Legal',
          description: 'Desarrollo de estrategias legales comprehensivas',
          promptKey: 'strategy_system_prompt',
          modelKey: 'strategy_ai_model',
          colorClass: 'border-l-green-500'
        }
      ]
    },
    {
      id: 'assistant-functions',
      name: 'Asistentes Virtuales',
      description: 'Configuración de asistentes conversacionales',
      icon: <MessageSquare className="w-5 h-5" />,
      functions: [
        {
          id: 'lexi',
          name: 'Lexi - Asistente Legal',
          description: 'Asistente virtual principal de tuconsultorlegal.co',
          promptKey: 'lexi_chat_prompt',
          modelKey: 'document_chat_ai_model',
          colorClass: 'border-l-indigo-500'
        },
        {
          id: 'routing',
          name: 'Routing de Consultas',
          description: 'Sistema de clasificación y enrutamiento de consultas',
          promptKey: 'routing_chat_prompt',
          modelKey: 'document_chat_ai_model',
          colorClass: 'border-l-indigo-500'
        },
        {
          id: 'training',
          name: 'Asistente de Entrenamiento',
          description: 'Formación y certificación de abogados en IA',
          promptKey: 'legal_training_assistant_prompt',
          modelKey: 'document_chat_ai_model',
          colorClass: 'border-l-indigo-500'
        }
      ]
    },
    {
      id: 'utility-functions',
      name: 'Utilidades',
      description: 'Funciones de soporte y optimización',
      icon: <Wrench className="w-5 h-5" />,
      functions: [
        {
          id: 'crm_segmentation',
          name: 'Segmentación CRM',
          description: 'Clasificación inteligente de clientes',
          promptKey: 'crm_segmentation_prompt',
          modelKey: 'content_optimization_model',
          colorClass: 'border-l-orange-500'
        },
        {
          id: 'organize_file',
          name: 'Organizar Archivos',
          description: 'Organización inteligente de archivos legales',
          promptKey: 'organize_file_prompt',
          modelKey: 'content_optimization_model',
          colorClass: 'border-l-orange-500'
        },
        {
          id: 'organize_form',
          name: 'Organizar Formularios',
          description: 'Optimización de grupos de formularios',
          promptKey: 'organize_form_prompt',
          modelKey: 'content_optimization_model',
          colorClass: 'border-l-orange-500'
        },
        {
          id: 'training_validator',
          name: 'Validador de Entrenamiento',
          description: 'Evaluación de respuestas en entrenamiento',
          promptKey: 'ai_training_validator_prompt',
          modelKey: 'content_optimization_model',
          colorClass: 'border-l-orange-500'
        }
      ]
    }
  ];

  // Global parameters configuration
  const globalParams = [
    { key: 'openai_api_timeout', name: 'Timeout OpenAI (segundos)', type: 'number' as const, defaultValue: '30' },
    { key: 'max_retry_attempts', name: 'Máximo de Reintentos', type: 'number' as const, defaultValue: '3' },
    { key: 'document_sla_hours', name: 'SLA de Documentos (horas)', type: 'number' as const, defaultValue: '4' },
    { key: 'api_rate_limit_requests', name: 'Límite de Peticiones/min', type: 'number' as const, defaultValue: '100' }
  ];

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
        description: "No se pudieron cargar las configuraciones",
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
        toast({
          title: "Error",
          description: "No se pudieron cargar los modelos de OpenAI",
          variant: "destructive"
        });
        return;
      }

      if (data?.success && data?.models) {
        const modelIds = data.models.map((model: any) => model.id);
        setOpenaiModels(modelIds);
        toast({
          title: "Éxito",
          description: `Se cargaron ${modelIds.length} modelos`
        });
      }
    } catch (error: any) {
      console.error('Error loading models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const saveConfig = async (key: string, value: string, description?: string) => {
    const { data, error } = await supabase.functions.invoke('update-system-config', {
      body: {
        configKey: key,
        configValue: value,
        description: description || null
      }
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Error al guardar');
    
    await loadConfigs();
  };

  const initializeDefaultConfigs = async (force: boolean = false) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('init-system-config', {
        body: { force }
      });
      
      if (error) throw error;

      if (data?.success) {
        toast({
          title: force ? "Sincronización forzada completada" : "Configuraciones inicializadas",
          description: force 
            ? `Se actualizaron/crearon ${data.configsUpserted} configuraciones.`
            : `Se agregaron ${data.insertedCount} nuevas configuraciones.`
        });
        await loadConfigs();
      }
    } catch (error: any) {
      console.error('Error initializing configs:', error);
      toast({
        title: "Error",
        description: "Error al inicializar configuraciones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getConfigValue = (key: string, defaultValue: string = ''): string => {
    const config = configs.find(c => c.config_key === key);
    return config?.config_value || defaultValue;
  };

  const getParamsForFunction = (additionalParams?: { key: string; name: string; type: 'text' | 'number' }[]): Record<string, string> => {
    if (!additionalParams) return {};
    const result: Record<string, string> = {};
    additionalParams.forEach(param => {
      result[param.key] = getConfigValue(param.key, '');
    });
    return result;
  };

  const currentCategory = functionCategories.find(cat => cat.id === selectedCategory);

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
    <div className="flex h-[calc(100vh-200px)] gap-6">
      {/* Sidebar Navigation */}
      <div className="w-72 flex-shrink-0">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuración IA
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => initializeDefaultConfigs(false)}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100%-80px)]">
              <div className="p-2 space-y-1">
                {functionCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setShowGlobalParams(false);
                    }}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedCategory === category.id && !showGlobalParams
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className={`mt-0.5 ${
                      selectedCategory === category.id && !showGlobalParams
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }`}>
                      {category.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{category.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {category.functions.length} funciones
                      </div>
                    </div>
                  </button>
                ))}
                
                <Separator className="my-2" />
                
                {/* Prompt Optimizer */}
                <button
                  onClick={() => {
                    setShowGlobalParams(false);
                    setSelectedCategory('meta-prompt');
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                    selectedCategory === 'meta-prompt'
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Sparkles className={`w-5 h-5 mt-0.5 ${
                    selectedCategory === 'meta-prompt' ? 'text-amber-500' : 'text-muted-foreground'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Meta Prompt</div>
                    <div className="text-xs text-muted-foreground">
                      Optimizador de prompts
                    </div>
                  </div>
                </button>
                
                {/* Global Params */}
                <button
                  onClick={() => setShowGlobalParams(true)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                    showGlobalParams
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Settings className={`w-5 h-5 mt-0.5 ${
                    showGlobalParams ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Parámetros Globales</div>
                    <div className="text-xs text-muted-foreground">
                      Timeouts, límites, SLA
                    </div>
                  </div>
                </button>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          {showGlobalParams ? (
            <GlobalParamsSection
              params={globalParams}
              getConfigValue={getConfigValue}
              onSave={saveConfig}
            />
          ) : selectedCategory === 'meta-prompt' ? (
            <MetaPromptSection
              currentPrompt={getConfigValue('prompt_optimizer_meta_prompt', '')}
              currentModel={getConfigValue('prompt_optimizer_model', 'gpt-4.1-2025-04-14')}
              openaiModels={openaiModels}
              loadingModels={loadingModels}
              onLoadModels={loadOpenAIModels}
              onSave={saveConfig}
            />
          ) : currentCategory && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    {currentCategory.icon}
                    {currentCategory.name}
                  </h2>
                  <p className="text-muted-foreground">{currentCategory.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadOpenAIModels}
                  disabled={loadingModels}
                >
                  {loadingModels ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Cargar Modelos
                </Button>
              </div>

              <div className="space-y-4">
                {currentCategory.functions.map((func) => (
                  <AIFunctionConfig
                    key={func.id}
                    functionId={func.id}
                    name={func.name}
                    description={func.description}
                    promptKey={func.promptKey}
                    modelKey={func.modelKey}
                    additionalParams={func.additionalParams}
                    currentPrompt={getConfigValue(func.promptKey, '')}
                    currentModel={func.modelKey ? getConfigValue(func.modelKey, '') : ''}
                    currentParams={getParamsForFunction(func.additionalParams)}
                    openaiModels={openaiModels}
                    loadingModels={loadingModels}
                    onLoadModels={loadOpenAIModels}
                    onSave={saveConfig}
                    colorClass={func.colorClass}
                  />
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

// Global Params Section Component
function GlobalParamsSection({
  params,
  getConfigValue,
  onSave
}: {
  params: { key: string; name: string; type: 'text' | 'number'; defaultValue: string }[];
  getConfigValue: (key: string, defaultValue: string) => string;
  onSave: (key: string, value: string, description?: string) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initial: Record<string, string> = {};
    params.forEach(p => {
      initial[p.key] = getConfigValue(p.key, p.defaultValue);
    });
    setValues(initial);
  }, [params, getConfigValue]);

  const handleSave = async (key: string, name: string) => {
    setSaving(key);
    try {
      await onSave(key, values[key], name);
      toast({
        title: "Guardado",
        description: `${name} guardado correctamente`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Settings className="w-6 h-6" />
          Parámetros Globales
        </h2>
        <p className="text-muted-foreground">
          Configuraciones generales del sistema: timeouts, límites y SLA
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {params.map((param) => (
            <div key={param.key} className="space-y-2">
              <Label>{param.name}</Label>
              <div className="flex gap-2">
                <Input
                  type={param.type}
                  value={values[param.key] || ''}
                  onChange={(e) => setValues({ ...values, [param.key]: e.target.value })}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleSave(param.key, param.name)}
                  disabled={saving === param.key}
                >
                  {saving === param.key ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Clave: <code className="bg-muted px-1 rounded">{param.key}</code>
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Meta Prompt Section Component
function MetaPromptSection({
  currentPrompt,
  currentModel,
  openaiModels,
  loadingModels,
  onLoadModels,
  onSave
}: {
  currentPrompt: string;
  currentModel: string;
  openaiModels: string[];
  loadingModels: boolean;
  onLoadModels: () => void;
  onSave: (key: string, value: string, description?: string) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState(currentPrompt);
  const [model, setModel] = useState(currentModel);
  const [saving, setSaving] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setPrompt(currentPrompt);
  }, [currentPrompt]);

  useEffect(() => {
    setModel(currentModel);
  }, [currentModel]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave('prompt_optimizer_meta_prompt', prompt, 'Meta prompt maestro para optimización de prompts');
      toast({
        title: "Guardado",
        description: "Meta prompt guardado correctamente"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveModel = async () => {
    setSavingModel(true);
    try {
      await onSave('prompt_optimizer_model', model, 'Modelo para optimización de prompts');
      toast({
        title: "Guardado",
        description: "Modelo guardado correctamente"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSavingModel(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-amber-500" />
            Meta Prompt - Optimizador
          </h2>
          <p className="text-muted-foreground">
            Este prompt maestro se usa para optimizar todos los demás prompts del sistema
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onLoadModels}
          disabled={loadingModels}
        >
          {loadingModels ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Cargar Modelos
        </Button>
      </div>

      {/* Model Configuration Card */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Modelo de Optimización</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Seleccionar modelo...</option>
              <option value="gpt-4.1-2025-04-14">gpt-4.1-2025-04-14 (default)</option>
              <option value="gpt-5-2025-08-07">gpt-5-2025-08-07</option>
              <option value="gpt-5-mini-2025-08-07">gpt-5-mini-2025-08-07</option>
              <option value="gpt-5-nano-2025-08-07">gpt-5-nano-2025-08-07</option>
              <option value="o3-2025-04-16">o3-2025-04-16</option>
              <option value="o4-mini-2025-04-16">o4-mini-2025-04-16</option>
              {openaiModels.filter(m => !['gpt-4.1-2025-04-14', 'gpt-5-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-5-nano-2025-08-07', 'o3-2025-04-16', 'o4-mini-2025-04-16'].includes(m)).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <Button
              onClick={handleSaveModel}
              disabled={savingModel}
            >
              {savingModel ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Clave: <code className="bg-muted px-1 rounded">prompt_optimizer_model</code>
          </p>
        </CardContent>
      </Card>

      {/* Prompt Card */}
      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="pt-6 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Variables Disponibles
            </h4>
            <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <p><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{"{{function_name}}"}</code> - Nombre de la función</p>
              <p><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{"{{function_description}}"}</code> - Descripción de la función</p>
              <p><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{"{{expected_output}}"}</code> - Tipo de output esperado</p>
              <p><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{"{{current_prompt}}"}</code> - Prompt actual a optimizar</p>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Meta Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={20}
              className="font-mono text-sm"
              placeholder="Ingresa el meta prompt para optimización..."
            />
          </div>

          <Button 
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar Meta Prompt
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
