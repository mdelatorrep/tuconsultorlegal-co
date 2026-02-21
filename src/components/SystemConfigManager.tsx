import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Settings, 
  RefreshCw, 
  Brain, 
  Sparkles,
  Save,
  Zap,
  Cog,
  FileText,
  Mic
} from "lucide-react";
import AIFunctionsGrid from "./admin/config/AIFunctionsGrid";
import OperationalConfigGrid from "./admin/config/OperationalConfigGrid";
import VoiceConfigSection from "./admin/VoiceConfigSection";
import { AI_CATEGORIES, OPERATIONAL_GROUPS, GLOBAL_PARAMS } from "./admin/config/configDefinitions";

interface SystemConfig {
  id: string;
  config_key: string;
  config_value: string;
  description?: string;
}

export default function SystemConfigManager() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [openaiModels, setOpenaiModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [activeTab, setActiveTab] = useState("ai-functions");
  const [selectedAICategory, setSelectedAICategory] = useState(AI_CATEGORIES[0].id);
  const { toast } = useToast();

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

  const initializeDefaultConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('init-system-config', {
        body: { force: true }
      });
      
      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Sincronización completada",
          description: `Se actualizaron ${data.configsUpserted || 0} configuraciones.`
        });
        await loadConfigs();
      }
    } catch (error: any) {
      console.error('Error initializing configs:', error);
      toast({
        title: "Error",
        description: "Error al sincronizar configuraciones",
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

  const currentAICategory = AI_CATEGORIES.find(c => c.id === selectedAICategory);

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Configuración del Sistema
          </h1>
          <p className="text-sm text-muted-foreground">
            {configs.length} configuraciones cargadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadOpenAIModels}
            disabled={loadingModels}
          >
            {loadingModels ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            Modelos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={initializeDefaultConfigs}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="ai-functions" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">IA</span>
          </TabsTrigger>
          <TabsTrigger value="operational" className="flex items-center gap-2">
            <Cog className="w-4 h-4" />
            <span className="hidden sm:inline">Operacional</span>
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Voz</span>
          </TabsTrigger>
          <TabsTrigger value="meta-prompt" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Meta</span>
          </TabsTrigger>
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Global</span>
          </TabsTrigger>
        </TabsList>

        {/* AI Functions Tab */}
        <TabsContent value="ai-functions" className="mt-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Funciones de IA</CardTitle>
                <Badge variant="secondary">
                  {AI_CATEGORIES.reduce((sum, cat) => sum + cat.functions.length, 0)} funciones
                </Badge>
              </div>
              {/* Category Pills */}
              <div className="flex flex-wrap gap-2 mt-3">
                {AI_CATEGORIES.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedAICategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedAICategory(category.id)}
                    className="h-7 text-xs"
                  >
                    {category.icon}
                    <span className="ml-1.5">{category.name}</span>
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                      {category.functions.length}
                    </Badge>
                  </Button>
                ))}
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="p-4">
              {currentAICategory && (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {currentAICategory.description}
                  </p>
                  <AIFunctionsGrid
                    functions={currentAICategory.functions}
                    getConfigValue={getConfigValue}
                    openaiModels={openaiModels}
                    onSave={saveConfig}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operational Tab */}
        <TabsContent value="operational" className="mt-4">
          <OperationalConfigGrid
            groups={OPERATIONAL_GROUPS}
            getConfigValue={getConfigValue}
            onSave={saveConfig}
          />
        </TabsContent>

        {/* Voice Tab */}
        <TabsContent value="voice" className="mt-4">
          <VoiceConfigSection
            configs={configs}
            getConfigValue={getConfigValue}
            onSave={saveConfig}
          />
        </TabsContent>

        {/* Meta Prompt Tab */}
        <TabsContent value="meta-prompt" className="mt-4">
          <MetaPromptSection
            getConfigValue={getConfigValue}
            openaiModels={openaiModels}
            onSave={saveConfig}
          />
        </TabsContent>

        {/* Global Parameters Tab */}
        <TabsContent value="global" className="mt-4">
          <GlobalParamsSection
            getConfigValue={getConfigValue}
            onSave={saveConfig}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Meta Prompt Section Component
function MetaPromptSection({
  getConfigValue,
  openaiModels,
  onSave
}: {
  getConfigValue: (key: string, defaultValue: string) => string;
  openaiModels: string[];
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [reasoningEffort, setReasoningEffort] = useState("medium");
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setPrompt(getConfigValue('prompt_optimizer_meta_prompt', ''));
    setModel(getConfigValue('prompt_optimizer_model', 'gpt-4.1-2025-04-14'));
    setReasoningEffort(getConfigValue('reasoning_effort_prompt_optimizer', 'medium'));
  }, [getConfigValue]);

  const handleSave = async (key: string, value: string, label: string) => {
    setSaving(key);
    try {
      await onSave(key, value);
      toast({ title: `${label} guardado` });
    } catch (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const REASONING_OPTIONS = [
    { value: 'low', label: 'Bajo' },
    { value: 'medium', label: 'Medio' },
    { value: 'high', label: 'Alto' }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Settings Card */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Configuración del Optimizador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model */}
          <div className="space-y-2">
            <Label className="text-sm">Modelo</Label>
            <div className="flex gap-2">
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar modelo" />
                </SelectTrigger>
                <SelectContent>
                  {openaiModels.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                size="icon"
                onClick={() => handleSave('prompt_optimizer_model', model, 'Modelo')}
                disabled={saving === 'prompt_optimizer_model'}
              >
                {saving === 'prompt_optimizer_model' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Reasoning Effort */}
          <div className="space-y-2">
            <Label className="text-sm">Esfuerzo de Razonamiento</Label>
            <div className="flex gap-2">
              <div className="flex-1 grid grid-cols-3 gap-1">
                {REASONING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setReasoningEffort(opt.value)}
                    className={`p-2 rounded-md border text-sm transition-all ${
                      reasoningEffort === opt.value
                        ? 'border-primary bg-primary/10 font-medium'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <Button 
                size="icon"
                onClick={() => handleSave('reasoning_effort_prompt_optimizer', reasoningEffort, 'Reasoning')}
                disabled={saving === 'reasoning_effort_prompt_optimizer'}
              >
                {saving === 'reasoning_effort_prompt_optimizer' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Variables Info */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <h4 className="font-medium text-amber-800 dark:text-amber-200 text-xs mb-2">Variables disponibles</h4>
            <div className="text-xs text-amber-700 dark:text-amber-300 grid grid-cols-2 gap-1">
              <code>{"{{function_name}}"}</code>
              <code>{"{{function_description}}"}</code>
              <code>{"{{expected_output}}"}</code>
              <code>{"{{current_prompt}}"}</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prompt Card */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Meta Prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={12}
            className="font-mono text-sm"
            placeholder="Prompt maestro para optimizar otros prompts..."
          />
          <Button 
            className="w-full"
            onClick={() => handleSave('prompt_optimizer_meta_prompt', prompt, 'Meta Prompt')}
            disabled={saving === 'prompt_optimizer_meta_prompt'}
          >
            {saving === 'prompt_optimizer_meta_prompt' ? (
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

// Global Params Section Component
function GlobalParamsSection({
  getConfigValue,
  onSave
}: {
  getConfigValue: (key: string, defaultValue: string) => string;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    const initial: Record<string, string> = {};
    GLOBAL_PARAMS.forEach(p => {
      initial[p.key] = getConfigValue(p.key, p.defaultValue);
    });
    setValues(initial);
  }, [getConfigValue]);

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setDirty(prev => new Set(prev).add(key));
  };

  const handleSave = async (key: string, label: string) => {
    setSaving(key);
    try {
      await onSave(key, values[key]);
      setDirty(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      toast({ title: `${label} guardado` });
    } catch (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Parámetros Globales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {GLOBAL_PARAMS.map((param) => (
          <div key={param.key} className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-sm font-medium">{param.label}</Label>
              <p className="text-xs text-muted-foreground">
                <code className="bg-muted px-1 rounded">{param.key}</code>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={values[param.key] || ''}
                onChange={(e) => handleChange(param.key, e.target.value)}
                className="w-28 h-8 text-right"
              />
              {dirty.has(param.key) && (
                <Button 
                  size="icon" 
                  variant="default"
                  className="h-8 w-8"
                  onClick={() => handleSave(param.key, param.label)}
                  disabled={saving === param.key}
                >
                  {saving === param.key ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
