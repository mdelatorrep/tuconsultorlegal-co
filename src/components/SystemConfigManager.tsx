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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  Brain,
  ChevronRight,
  ChevronDown,
  Users,
  Calendar,
  Shield,
  CreditCard,
  Trophy,
  Gavel,
  Search,
  Mic
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
  reasoningEffortKey?: string;
  webSearchKey?: string;
  webSearchCategoriesKey?: string;
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

interface CategoryGroup {
  id: string;
  name: string;
  icon: React.ReactNode;
  categories: FunctionCategory[];
}

export default function SystemConfigManager() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [openaiModels, setOpenaiModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('agent-functions');
  const [showGlobalParams, setShowGlobalParams] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['ai-functions', 'operational']);
  const { toast } = useToast();

  // Define function categories organized into groups
  const aiCategories: FunctionCategory[] = [
    {
      id: 'agent-functions',
      name: 'Agentes',
      description: 'Creación de agentes IA',
      icon: <Bot className="w-4 h-4" />,
      functions: [
        {
          id: 'improve_clause',
          name: 'Mejorar Cláusulas',
          description: 'Optimiza cláusulas legales en plantillas',
          promptKey: 'improve_clause_ai_prompt',
          modelKey: 'improve_clause_ai_model',
          reasoningEffortKey: 'improve_clause_reasoning_effort',
          webSearchKey: 'web_search_enabled_improve_clause',
          webSearchCategoriesKey: 'web_search_categories_improve_clause',
          colorClass: 'border-l-purple-500'
        },
        {
          id: 'suggest_blocks',
          name: 'Bloques de Conversación',
          description: 'Genera bloques para agentes',
          promptKey: 'suggest_conversation_blocks_prompt',
          modelKey: 'suggest_blocks_ai_model',
          reasoningEffortKey: 'suggest_blocks_reasoning_effort',
          colorClass: 'border-l-purple-500'
        },
        {
          id: 'agent_creation',
          name: 'ADN de Agentes',
          description: 'Comportamiento base de agentes',
          promptKey: 'agent_creation_system_prompt',
          modelKey: 'agent_creation_ai_model',
          colorClass: 'border-l-purple-500'
        }
      ]
    },
    {
      id: 'document-functions',
      name: 'Documentos',
      description: 'Generación de documentos',
      icon: <FileText className="w-4 h-4" />,
      functions: [
        {
          id: 'document_chat',
          name: 'Chat de Documentos',
          description: 'Recopila información del usuario',
          promptKey: 'document_chat_prompt',
          modelKey: 'document_chat_ai_model',
          colorClass: 'border-l-blue-500'
        },
        {
          id: 'generate_document',
          name: 'Generar Documento',
          description: 'Genera el documento final',
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
      description: 'Investigación, análisis, redacción',
      icon: <Scale className="w-4 h-4" />,
      functions: [
        {
          id: 'research',
          name: 'Investigación',
          description: 'Análisis de legislación',
          promptKey: 'research_system_prompt',
          modelKey: 'research_ai_model',
          webSearchKey: 'web_search_enabled_research',
          colorClass: 'border-l-green-500'
        },
        {
          id: 'analysis',
          name: 'Análisis',
          description: 'Evaluación de documentos',
          promptKey: 'analysis_system_prompt',
          modelKey: 'analysis_ai_model',
          colorClass: 'border-l-green-500'
        },
        {
          id: 'drafting',
          name: 'Redacción',
          description: 'Creación de documentos',
          promptKey: 'drafting_system_prompt',
          modelKey: 'drafting_ai_model',
          colorClass: 'border-l-green-500'
        },
        {
          id: 'strategy',
          name: 'Estrategia',
          description: 'Estrategias legales',
          promptKey: 'strategy_system_prompt',
          modelKey: 'strategy_ai_model',
          colorClass: 'border-l-green-500'
        }
      ]
    },
    {
      id: 'case-predictor',
      name: 'Predictor de Casos',
      description: 'Predicción de resultados',
      icon: <Gavel className="w-4 h-4" />,
      functions: [
        {
          id: 'case_predictor',
          name: 'Predictor',
          description: 'Analiza y predice resultados',
          promptKey: 'case_predictor_system_prompt',
          modelKey: 'case_predictor_ai_model',
          colorClass: 'border-l-rose-500'
        }
      ]
    },
    {
      id: 'legal-copilot',
      name: 'Copiloto Legal',
      description: 'Asistencia en tiempo real',
      icon: <Sparkles className="w-4 h-4" />,
      functions: [
        {
          id: 'copilot_suggest',
          name: 'Sugerencias',
          description: 'Sugerencias mientras escribe',
          promptKey: 'copilot_suggest_prompt',
          modelKey: 'copilot_ai_model',
          additionalParams: [
            { key: 'copilot_max_tokens_suggest', name: 'Max Tokens', type: 'number' as const }
          ],
          colorClass: 'border-l-cyan-500'
        },
        {
          id: 'copilot_autocomplete',
          name: 'Autocompletado',
          description: 'Completa cláusulas',
          promptKey: 'copilot_autocomplete_prompt',
          modelKey: 'copilot_ai_model',
          additionalParams: [
            { key: 'copilot_max_tokens_autocomplete', name: 'Max Tokens', type: 'number' as const }
          ],
          colorClass: 'border-l-cyan-500'
        },
        {
          id: 'copilot_risks',
          name: 'Detección de Riesgos',
          description: 'Identifica riesgos',
          promptKey: 'copilot_risk_detection_prompt',
          modelKey: 'copilot_ai_model',
          colorClass: 'border-l-cyan-500'
        },
        {
          id: 'copilot_improve',
          name: 'Mejorar Texto',
          description: 'Mejora claridad',
          promptKey: 'copilot_improve_prompt',
          modelKey: 'copilot_ai_model',
          colorClass: 'border-l-cyan-500'
        }
      ]
    },
    {
      id: 'assistant-functions',
      name: 'Asistentes',
      description: 'Asistentes conversacionales',
      icon: <MessageSquare className="w-4 h-4" />,
      functions: [
        {
          id: 'lexi',
          name: 'Lexi',
          description: 'Asistente legal principal',
          promptKey: 'lexi_chat_prompt',
          modelKey: 'lexi_ai_model',
          colorClass: 'border-l-indigo-500'
        },
        {
          id: 'routing',
          name: 'Routing',
          description: 'Clasificación de consultas',
          promptKey: 'routing_chat_prompt',
          modelKey: 'routing_ai_model',
          colorClass: 'border-l-indigo-500'
        },
        {
          id: 'training',
          name: 'Entrenamiento',
          description: 'Formación de abogados',
          promptKey: 'legal_training_assistant_prompt',
          modelKey: 'training_assistant_ai_model',
          colorClass: 'border-l-indigo-500'
        }
      ]
    },
    {
      id: 'process-query',
      name: 'Consulta Procesos',
      description: 'Procesos judiciales',
      icon: <Search className="w-4 h-4" />,
      functions: [
        {
          id: 'process_query',
          name: 'Consulta de Procesos',
          description: 'Consulta en Rama Judicial',
          promptKey: 'process_query_ai_prompt',
          modelKey: 'process_query_ai_model',
          colorClass: 'border-l-amber-500'
        }
      ]
    },
    {
      id: 'utility-functions',
      name: 'Utilidades',
      description: 'Funciones de soporte',
      icon: <Wrench className="w-4 h-4" />,
      functions: [
        {
          id: 'improve_document_info',
          name: 'Mejorar Info',
          description: 'Optimiza descripciones',
          promptKey: 'document_description_optimizer_prompt',
          modelKey: 'document_description_optimizer_model',
          colorClass: 'border-l-orange-500'
        },
        {
          id: 'crm_segmentation',
          name: 'Segmentación CRM',
          description: 'Clasificación de clientes',
          promptKey: 'crm_segmentation_prompt',
          modelKey: 'crm_segmentation_ai_model',
          colorClass: 'border-l-orange-500'
        },
        {
          id: 'organize_file',
          name: 'Organizar Archivos',
          description: 'Organización de archivos',
          promptKey: 'organize_file_prompt',
          modelKey: 'organize_file_ai_model',
          colorClass: 'border-l-orange-500'
        }
      ]
    }
  ];

  // Operational config categories (non-AI)
  const operationalCategories = [
    { id: 'crm-config', name: 'CRM', icon: <Users className="w-4 h-4" />, keys: ['crm_max_leads_per_lawyer', 'crm_auto_followup_days', 'crm_reminder_hours', 'crm_lead_expiration_days', 'crm_auto_convert_lead_to_client', 'crm_email_notifications_enabled'] },
    { id: 'calendar-config', name: 'Calendario', icon: <Calendar className="w-4 h-4" />, keys: ['calendar_reminder_hours_before', 'calendar_auto_docket_enabled', 'calendar_working_hours_start', 'calendar_working_hours_end', 'calendar_default_event_duration_minutes', 'calendar_holidays_enabled'] },
    { id: 'client-portal-config', name: 'Portal Cliente', icon: <Shield className="w-4 h-4" />, keys: ['client_portal_document_upload_enabled', 'client_portal_appointment_scheduling_enabled', 'client_portal_case_visibility', 'client_portal_message_enabled', 'client_portal_ai_summary_enabled', 'client_portal_max_file_size_mb'] },
    { id: 'process-config', name: 'Procesos Judiciales', icon: <Gavel className="w-4 h-4" />, keys: ['process_monitor_sync_frequency_hours', 'process_alert_new_actuacion_enabled', 'process_alert_email_enabled', 'process_auto_create_calendar_event', 'process_rama_judicial_cache_hours', 'process_auto_link_to_case'] },
    { id: 'gamification-config', name: 'Gamificación', icon: <Trophy className="w-4 h-4" />, keys: ['gamification_enabled', 'gamification_points_config', 'gamification_streak_bonus_multiplier', 'gamification_daily_goal_credits', 'gamification_levels'] },
    { id: 'credits-config', name: 'Créditos', icon: <CreditCard className="w-4 h-4" />, keys: ['credits_daily_free_limit', 'credits_referral_bonus', 'credits_warning_threshold', 'credits_welcome_bonus', 'credits_auto_recharge_enabled', 'credits_auto_recharge_amount'] },
    { id: 'verification-config', name: 'Verificación', icon: <Shield className="w-4 h-4" />, keys: ['verification_verifik_enabled', 'verification_manual_approval_required', 'verification_expiration_days'] },
    { id: 'voice-config', name: 'Asistente de Voz', icon: <Mic className="w-4 h-4" />, keys: ['voice_assistant_enabled', 'voice_transcription_model', 'voice_transcription_language', 'voice_transcription_prompt', 'voice_tts_model', 'voice_tts_voice', 'voice_max_audio_size_mb', 'voice_max_text_chars'] }
  ];

  // Global parameters configuration
  const globalParams = [
    { key: 'openai_api_timeout', name: 'Timeout OpenAI (ms)', type: 'number' as const, defaultValue: '120000' },
    { key: 'max_retries_ai_requests', name: 'Máximo de Reintentos', type: 'number' as const, defaultValue: '3' },
    { key: 'default_sla_hours', name: 'SLA de Documentos (horas)', type: 'number' as const, defaultValue: '24' }
  ];

  useEffect(() => {
    loadConfigs();
    loadOpenAIModels();
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
      
      if (error) return;

      if (data?.success && data?.models) {
        const modelIds = data.models.map((model: any) => model.id);
        setOpenaiModels(modelIds);
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
          title: force ? "Sincronización completada" : "Configuraciones inicializadas",
          description: force 
            ? `Se actualizaron ${data.configsUpserted} configuraciones.`
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

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(g => g !== groupId)
        : [...prev, groupId]
    );
  };

  const currentCategory = aiCategories.find(cat => cat.id === selectedCategory);
  const currentOperationalConfig = operationalCategories.find(cat => cat.id === selectedCategory);

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
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Sidebar Navigation */}
      <div className="w-64 flex-shrink-0">
        <Card className="h-full">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configuración
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => initializeDefaultConfigs(true)}
                disabled={loading}
                title="Sincronizar configuraciones"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100%-60px)]">
              <div className="p-2 space-y-1">
                {/* AI Functions Group */}
                <Collapsible 
                  open={expandedGroups.includes('ai-functions')}
                  onOpenChange={() => toggleGroup('ai-functions')}
                >
                  <CollapsibleTrigger className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-sm font-medium">
                    {expandedGroups.includes('ai-functions') ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <Brain className="w-4 h-4 text-primary" />
                    <span>Funciones IA</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {aiCategories.reduce((sum, cat) => sum + cat.functions.length, 0)}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 space-y-0.5">
                    {aiCategories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => {
                          setSelectedCategory(category.id);
                          setShowGlobalParams(false);
                        }}
                        className={`w-full flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors ${
                          selectedCategory === category.id && !showGlobalParams
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        {category.icon}
                        <span className="truncate flex-1">{category.name}</span>
                        <span className="text-xs opacity-50">{category.functions.length}</span>
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                {/* Operational Config Group */}
                <Collapsible 
                  open={expandedGroups.includes('operational')}
                  onOpenChange={() => toggleGroup('operational')}
                >
                  <CollapsibleTrigger className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-sm font-medium">
                    {expandedGroups.includes('operational') ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <Settings className="w-4 h-4 text-orange-500" />
                    <span>Operacional</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {operationalCategories.length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 space-y-0.5">
                    {operationalCategories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => {
                          setSelectedCategory(category.id);
                          setShowGlobalParams(false);
                        }}
                        className={`w-full flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors ${
                          selectedCategory === category.id && !showGlobalParams
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        {category.icon}
                        <span className="truncate">{category.name}</span>
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                <Separator className="my-2" />

                {/* Meta Prompt */}
                <button
                  onClick={() => {
                    setShowGlobalParams(false);
                    setSelectedCategory('meta-prompt');
                  }}
                  className={`w-full flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors ${
                    selectedCategory === 'meta-prompt'
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Meta Prompt</span>
                </button>
                
                {/* Global Params */}
                <button
                  onClick={() => setShowGlobalParams(true)}
                  className={`w-full flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors ${
                    showGlobalParams
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Globales</span>
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
              currentReasoningEffort={getConfigValue('reasoning_effort_prompt_optimizer', 'medium')}
              openaiModels={openaiModels}
              loadingModels={loadingModels}
              onLoadModels={loadOpenAIModels}
              onSave={saveConfig}
            />
          ) : currentOperationalConfig ? (
            <OperationalConfigSection
              category={currentOperationalConfig}
              configs={configs}
              getConfigValue={getConfigValue}
              onSave={saveConfig}
            />
          ) : currentCategory && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    {currentCategory.icon}
                    {currentCategory.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{currentCategory.description}</p>
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
                  Modelos
                </Button>
              </div>

              <div className="space-y-3">
                {currentCategory.functions.map((func) => (
                  <AIFunctionConfig
                    key={func.id}
                    functionId={func.id}
                    name={func.name}
                    description={func.description}
                    promptKey={func.promptKey}
                    modelKey={func.modelKey}
                    reasoningEffortKey={func.reasoningEffortKey}
                    webSearchKey={func.webSearchKey}
                    webSearchCategoriesKey={func.webSearchCategoriesKey}
                    additionalParams={func.additionalParams}
                    currentPrompt={getConfigValue(func.promptKey, '')}
                    currentModel={func.modelKey ? getConfigValue(func.modelKey, '') : ''}
                    currentReasoningEffort={func.reasoningEffortKey ? getConfigValue(func.reasoningEffortKey, 'low') : 'low'}
                    currentWebSearchEnabled={func.webSearchKey ? getConfigValue(func.webSearchKey, 'false') === 'true' : false}
                    currentWebSearchCategories={func.webSearchCategoriesKey ? (() => {
                      try {
                        const val = getConfigValue(func.webSearchCategoriesKey, '[]');
                        return JSON.parse(val);
                      } catch {
                        return [];
                      }
                    })() : []}
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

// Operational Config Section Component
function OperationalConfigSection({
  category,
  configs,
  getConfigValue,
  onSave
}: {
  category: { id: string; name: string; icon: React.ReactNode; keys: string[] };
  configs: SystemConfig[];
  getConfigValue: (key: string, defaultValue: string) => string;
  onSave: (key: string, value: string, description?: string) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initial: Record<string, string> = {};
    category.keys.forEach(key => {
      initial[key] = getConfigValue(key, '');
    });
    setValues(initial);
  }, [category, getConfigValue]);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      const config = configs.find(c => c.config_key === key);
      await onSave(key, values[key], config?.description);
      toast({
        title: "Guardado",
        description: `${key} guardado correctamente`
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

  const getConfigDescription = (key: string) => {
    const config = configs.find(c => c.config_key === key);
    return config?.description || key;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          {category.icon}
          {category.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          Configuraciones operativas de {category.name.toLowerCase()}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {category.keys.map((key) => (
            <div key={key} className="space-y-2">
              <Label className="text-sm">{getConfigDescription(key)}</Label>
              <div className="flex gap-2">
                {values[key]?.startsWith('[') || values[key]?.startsWith('{') ? (
                  <Textarea
                    value={values[key] || ''}
                    onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                    className="flex-1 font-mono text-sm"
                    rows={3}
                  />
                ) : (
                  <Input
                    value={values[key] || ''}
                    onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                    className="flex-1"
                  />
                )}
                <Button
                  onClick={() => handleSave(key)}
                  disabled={saving === key}
                  size="icon"
                >
                  {saving === key ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                <code className="bg-muted px-1 rounded">{key}</code>
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
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
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Parámetros Globales
        </h2>
        <p className="text-sm text-muted-foreground">
          Timeouts, límites y SLA del sistema
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
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
                  size="icon"
                >
                  {saving === param.key ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                <code className="bg-muted px-1 rounded">{param.key}</code>
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
  currentReasoningEffort,
  openaiModels,
  loadingModels,
  onLoadModels,
  onSave
}: {
  currentPrompt: string;
  currentModel: string;
  currentReasoningEffort: string;
  openaiModels: string[];
  loadingModels: boolean;
  onLoadModels: () => void;
  onSave: (key: string, value: string, description?: string) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState(currentPrompt);
  const [model, setModel] = useState(currentModel);
  const [reasoningEffort, setReasoningEffort] = useState(currentReasoningEffort);
  const [saving, setSaving] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const [savingEffort, setSavingEffort] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setPrompt(currentPrompt);
  }, [currentPrompt]);

  useEffect(() => {
    setModel(currentModel);
  }, [currentModel]);

  useEffect(() => {
    setReasoningEffort(currentReasoningEffort);
  }, [currentReasoningEffort]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave('prompt_optimizer_meta_prompt', prompt, 'Meta prompt maestro');
      toast({ title: "Guardado", description: "Meta prompt guardado" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveModel = async () => {
    setSavingModel(true);
    try {
      await onSave('prompt_optimizer_model', model, 'Modelo para optimización');
      toast({ title: "Guardado", description: "Modelo guardado" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSavingModel(false);
    }
  };

  const handleSaveReasoningEffort = async () => {
    setSavingEffort(true);
    try {
      await onSave('reasoning_effort_prompt_optimizer', reasoningEffort, 'Nivel de reasoning');
      toast({ title: "Guardado", description: "Reasoning effort guardado" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSavingEffort(false);
    }
  };

  const REASONING_EFFORT_OPTIONS = [
    { value: 'low', label: 'Bajo', description: 'Máximo output' },
    { value: 'medium', label: 'Medio', description: 'Balanceado' },
    { value: 'high', label: 'Alto', description: 'Máximo razonamiento' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Meta Prompt
          </h2>
          <p className="text-sm text-muted-foreground">
            Prompt maestro para optimizar otros prompts
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onLoadModels} disabled={loadingModels}>
          {loadingModels ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Modelo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={model} onValueChange={setModel} disabled={loadingModels}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona modelo" />
              </SelectTrigger>
              <SelectContent>
                {openaiModels.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSaveModel} disabled={savingModel} size="sm" className="w-full">
              {savingModel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-cyan-500" />
              Reasoning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-1">
              {REASONING_EFFORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setReasoningEffort(option.value)}
                  className={`p-2 rounded-md border text-xs transition-all ${
                    reasoningEffort === option.value
                      ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950'
                      : 'border-border hover:border-cyan-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Button onClick={handleSaveReasoningEffort} disabled={savingEffort} size="sm" className="w-full">
              {savingEffort ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="pt-4 space-y-3">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <h4 className="font-medium text-amber-800 dark:text-amber-200 text-sm mb-1">Variables</h4>
            <div className="text-xs text-amber-700 dark:text-amber-300 grid grid-cols-2 gap-1">
              <span><code>{"{{function_name}}"}</code></span>
              <span><code>{"{{function_description}}"}</code></span>
              <span><code>{"{{expected_output}}"}</code></span>
              <span><code>{"{{current_prompt}}"}</code></span>
            </div>
          </div>

          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={15}
            className="font-mono text-sm"
            placeholder="Meta prompt..."
          />

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar Meta Prompt
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
