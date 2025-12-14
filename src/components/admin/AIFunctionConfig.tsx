import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ChevronDown, 
  Save, 
  Sparkles, 
  RefreshCw, 
  Check, 
  X,
  FileText,
  Brain,
  Settings,
  Zap
} from "lucide-react";

interface AIFunctionConfigProps {
  functionId: string;
  name: string;
  description: string;
  promptKey: string;
  modelKey?: string;
  reasoningEffortKey?: string;
  additionalParams?: { key: string; name: string; type: 'text' | 'number' }[];
  currentPrompt: string;
  currentModel: string;
  currentReasoningEffort?: string;
  currentParams: Record<string, string>;
  openaiModels: string[];
  loadingModels: boolean;
  onLoadModels: () => void;
  onSave: (key: string, value: string, description?: string) => Promise<void>;
  colorClass?: string;
}

const REASONING_EFFORT_OPTIONS = [
  { value: 'low', label: 'Bajo', description: 'Respuestas rápidas, ideal para tareas simples' },
  { value: 'medium', label: 'Medio', description: 'Balance entre velocidad y profundidad' },
  { value: 'high', label: 'Alto', description: 'Análisis profundo, más tokens de razonamiento' }
];

export default function AIFunctionConfig({
  functionId,
  name,
  description,
  promptKey,
  modelKey,
  reasoningEffortKey,
  additionalParams = [],
  currentPrompt,
  currentModel,
  currentReasoningEffort = 'low',
  currentParams,
  openaiModels,
  loadingModels,
  onLoadModels,
  onSave,
  colorClass = "border-l-primary"
}: AIFunctionConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState(currentPrompt);
  const [model, setModel] = useState(currentModel);
  const [reasoningEffort, setReasoningEffort] = useState(currentReasoningEffort);
  const [params, setParams] = useState<Record<string, string>>(currentParams);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const { toast } = useToast();

  // Sync state when props change (after configs load from database)
  useEffect(() => {
    setPrompt(currentPrompt);
  }, [currentPrompt]);

  useEffect(() => {
    setModel(currentModel);
  }, [currentModel]);

  useEffect(() => {
    setReasoningEffort(currentReasoningEffort);
  }, [currentReasoningEffort]);

  useEffect(() => {
    setParams(currentParams);
  }, [currentParams]);

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-prompt', {
        body: {
          prompt,
          functionName: name,
          functionDescription: description,
          expectedOutput: 'Texto estructurado'
        }
      });

      if (error) throw error;

      if (data?.success && data?.optimizedPrompt) {
        setOptimizedPrompt(data.optimizedPrompt);
        setShowComparison(true);
        toast({
          title: "Prompt optimizado",
          description: `Longitud: ${data.originalLength} → ${data.optimizedLength} caracteres`
        });
      } else {
        throw new Error(data?.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error optimizing prompt:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo optimizar el prompt",
        variant: "destructive"
      });
    } finally {
      setOptimizing(false);
    }
  };

  const acceptOptimizedPrompt = () => {
    if (optimizedPrompt) {
      setPrompt(optimizedPrompt);
      setOptimizedPrompt(null);
      setShowComparison(false);
      toast({
        title: "Prompt actualizado",
        description: "El prompt optimizado ha sido aplicado. Recuerda guardar los cambios."
      });
    }
  };

  const rejectOptimizedPrompt = () => {
    setOptimizedPrompt(null);
    setShowComparison(false);
  };

  const handleSavePrompt = async () => {
    setSaving(true);
    try {
      await onSave(promptKey, prompt, description);
      toast({
        title: "Guardado",
        description: "Prompt guardado correctamente"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveModel = async () => {
    if (!modelKey) return;
    setSaving(true);
    try {
      await onSave(modelKey, model, `Modelo IA para ${name}`);
      toast({
        title: "Guardado",
        description: "Modelo guardado correctamente"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReasoningEffort = async () => {
    if (!reasoningEffortKey) return;
    setSaving(true);
    try {
      await onSave(reasoningEffortKey, reasoningEffort, `Esfuerzo de razonamiento para ${name}`);
      toast({
        title: "Guardado",
        description: "Esfuerzo de razonamiento guardado correctamente"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveParam = async (key: string, paramName: string) => {
    setSaving(true);
    try {
      await onSave(key, params[key] || '', `${paramName} para ${name}`);
      toast({
        title: "Guardado",
        description: `${paramName} guardado correctamente`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`border-l-4 ${colorClass} transition-all hover:shadow-md`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-lg">{name}</h3>
                  {modelKey && currentModel && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      {currentModel.length > 25 ? currentModel.substring(0, 25) + '...' : currentModel}
                    </Badge>
                  )}
                  {reasoningEffortKey && currentReasoningEffort && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        currentReasoningEffort === 'high' ? 'border-orange-500 text-orange-600' :
                        currentReasoningEffort === 'medium' ? 'border-blue-500 text-blue-600' :
                        'border-green-500 text-green-600'
                      }`}
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      {currentReasoningEffort === 'high' ? 'Alto' : currentReasoningEffort === 'medium' ? 'Medio' : 'Bajo'}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <ChevronDown 
                className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`} 
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <Tabs defaultValue="prompt" className="w-full">
              <TabsList className={`grid w-full mb-4 ${
                modelKey && reasoningEffortKey && additionalParams.length > 0 ? 'grid-cols-4' :
                (modelKey && reasoningEffortKey) || (modelKey && additionalParams.length > 0) || (reasoningEffortKey && additionalParams.length > 0) ? 'grid-cols-3' :
                modelKey || reasoningEffortKey || additionalParams.length > 0 ? 'grid-cols-2' : 'grid-cols-1'
              }`}>
                <TabsTrigger value="prompt" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Prompt
                </TabsTrigger>
                {modelKey && (
                  <TabsTrigger value="model" className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Modelo
                  </TabsTrigger>
                )}
                {reasoningEffortKey && (
                  <TabsTrigger value="effort" className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Esfuerzo
                  </TabsTrigger>
                )}
                {additionalParams.length > 0 && (
                  <TabsTrigger value="params" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Parámetros
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Prompt Tab */}
              <TabsContent value="prompt" className="space-y-4">
                {showComparison && optimizedPrompt ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Comparación de Prompts</h4>
                      <div className="flex gap-2">
                        <Button size="sm" variant="default" onClick={acceptOptimizedPrompt}>
                          <Check className="w-4 h-4 mr-1" />
                          Aceptar
                        </Button>
                        <Button size="sm" variant="outline" onClick={rejectOptimizedPrompt}>
                          <X className="w-4 h-4 mr-1" />
                          Rechazar
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Original</Label>
                        <div className="bg-muted/50 rounded-lg p-3 text-sm max-h-80 overflow-y-auto font-mono text-xs">
                          {prompt}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-green-600 mb-2 block flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Optimizado
                        </Label>
                        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm max-h-80 overflow-y-auto font-mono text-xs">
                          {optimizedPrompt}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Clave: <code className="bg-muted px-1 rounded">{promptKey}</code>
                      </Label>
                      <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={12}
                        className="font-mono text-sm"
                        placeholder="Escribe el prompt del sistema..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={handleOptimize}
                        disabled={optimizing || !prompt.trim()}
                        className="flex-1"
                      >
                        {optimizing ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Optimizando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Optimizar con IA
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={handleSavePrompt}
                        disabled={saving}
                        className="flex-1"
                      >
                        {saving ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Guardar Prompt
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Model Tab */}
              {modelKey && (
                <TabsContent value="model" className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-muted-foreground">
                        Clave: <code className="bg-muted px-1 rounded">{modelKey}</code>
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onLoadModels}
                        disabled={loadingModels}
                        className="h-7 text-xs"
                      >
                        {loadingModels ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        <span className="ml-1">Actualizar lista</span>
                      </Button>
                    </div>
                    <Select
                      value={model}
                      onValueChange={setModel}
                      disabled={loadingModels}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {openaiModels.length > 0 ? (
                          openaiModels.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-models" disabled>
                            {loadingModels ? 'Cargando...' : 'No hay modelos disponibles'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {openaiModels.length === 0 && !loadingModels && (
                      <p className="text-xs text-orange-600 mt-2">
                        ⚠️ Haz clic en "Actualizar lista" para cargar los modelos disponibles
                      </p>
                    )}
                  </div>
                  <Button 
                    onClick={handleSaveModel}
                    disabled={saving || !model}
                    className="w-full"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar Modelo
                  </Button>
                </TabsContent>
              )}

              {/* Reasoning Effort Tab */}
              {reasoningEffortKey && (
                <TabsContent value="effort" className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-muted-foreground">
                        Clave: <code className="bg-muted px-1 rounded">{reasoningEffortKey}</code>
                      </Label>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <Zap className="w-4 h-4 inline mr-1" />
                        El esfuerzo de razonamiento controla cuántos tokens se usan para "pensar" antes de responder. 
                        Modelos GPT-5, o3 y o4 usan esto para mejorar la calidad de respuestas complejas.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {REASONING_EFFORT_OPTIONS.map((option) => (
                        <div
                          key={option.value}
                          onClick={() => setReasoningEffort(option.value)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            reasoningEffort === option.value
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              option.value === 'low' ? 'bg-green-500' :
                              option.value === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            <div>
                              <span className="font-medium">{option.label}</span>
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button 
                    onClick={handleSaveReasoningEffort}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar Esfuerzo
                  </Button>
                </TabsContent>
              )}

              {additionalParams.length > 0 && (
                <TabsContent value="params" className="space-y-4">
                  {additionalParams.map((param) => (
                    <div key={param.key} className="space-y-2">
                      <Label className="text-sm">
                        {param.name}
                        <span className="text-xs text-muted-foreground ml-2">
                          (<code>{param.key}</code>)
                        </span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type={param.type}
                          value={params[param.key] || ''}
                          onChange={(e) => setParams({ ...params, [param.key]: e.target.value })}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveParam(param.key, param.name)}
                          disabled={saving}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
