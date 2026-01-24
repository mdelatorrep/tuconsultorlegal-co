import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  Zap, 
  Globe, 
  FileText, 
  Save, 
  RefreshCw,
  Sparkles,
  Check
} from "lucide-react";

interface AIFunction {
  id: string;
  name: string;
  description: string;
  promptKey: string;
  modelKey?: string;
  reasoningEffortKey?: string;
  webSearchKey?: string;
}

interface AIFunctionsGridProps {
  functions: AIFunction[];
  getConfigValue: (key: string, defaultValue: string) => string;
  openaiModels: string[];
  onSave: (key: string, value: string) => Promise<void>;
}

const REASONING_OPTIONS = [
  { value: 'low', label: 'Bajo', color: 'text-green-600' },
  { value: 'medium', label: 'Medio', color: 'text-blue-600' },
  { value: 'high', label: 'Alto', color: 'text-orange-600' }
];

export default function AIFunctionsGrid({ 
  functions, 
  getConfigValue, 
  openaiModels, 
  onSave 
}: AIFunctionsGridProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<AIFunction | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const { toast } = useToast();

  const handleModelChange = async (func: AIFunction, value: string) => {
    if (!func.modelKey) return;
    setSaving(`model-${func.id}`);
    try {
      await onSave(func.modelKey, value);
      toast({ title: "Modelo actualizado" });
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleReasoningChange = async (func: AIFunction, value: string) => {
    if (!func.reasoningEffortKey) return;
    setSaving(`reasoning-${func.id}`);
    try {
      await onSave(func.reasoningEffortKey, value);
      toast({ title: "Reasoning actualizado" });
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  // Models that support web search
  const WEB_SEARCH_COMPATIBLE_MODELS = ['gpt-5', 'gpt-5-mini', 'gpt-4.1-2025-04-14', 'o3', 'o4-mini'];
  
  const isModelWebSearchCompatible = (model: string): boolean => {
    if (!model) return false;
    return WEB_SEARCH_COMPATIBLE_MODELS.some(compatible => 
      model.toLowerCase().includes(compatible.toLowerCase()) && 
      !model.toLowerCase().includes('nano')
    );
  };

  const handleWebSearchToggle = async (func: AIFunction, checked: boolean) => {
    if (!func.webSearchKey) return;
    setSaving(`web-${func.id}`);
    try {
      // If enabling web search, check if model is compatible
      if (checked && func.modelKey) {
        const currentModel = getConfigValue(func.modelKey, '');
        if (currentModel && !isModelWebSearchCompatible(currentModel)) {
          // Auto-upgrade to gpt-5-mini
          await onSave(func.modelKey, 'gpt-5-mini');
          toast({ 
            title: "Modelo actualizado", 
            description: "Se cambió a gpt-5-mini (compatible con web search)" 
          });
        }
      }
      await onSave(func.webSearchKey, checked ? 'true' : 'false');
      toast({ title: checked ? "Web Search activado" : "Web Search desactivado" });
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const openPromptEditor = (func: AIFunction) => {
    setEditingPrompt(func);
    setPromptValue(getConfigValue(func.promptKey, ''));
  };

  const savePrompt = async () => {
    if (!editingPrompt) return;
    setSaving(`prompt-${editingPrompt.id}`);
    try {
      await onSave(editingPrompt.promptKey, promptValue);
      toast({ title: "Prompt guardado" });
      setEditingPrompt(null);
    } catch (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {/* Header row */}
        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
          <div className="col-span-3">Función</div>
          <div className="col-span-3">Modelo</div>
          <div className="col-span-2">Reasoning</div>
          <div className="col-span-2 text-center">Web</div>
          <div className="col-span-2 text-center">Prompt</div>
        </div>

        {/* Function rows */}
        {functions.map((func) => {
          const currentModel = func.modelKey ? getConfigValue(func.modelKey, '') : '';
          const currentReasoning = func.reasoningEffortKey ? getConfigValue(func.reasoningEffortKey, 'low') : 'low';
          const webEnabled = func.webSearchKey ? getConfigValue(func.webSearchKey, 'false') === 'true' : false;
          const hasPrompt = !!getConfigValue(func.promptKey, '');

          return (
            <div 
              key={func.id} 
              className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors border-b border-border/50"
            >
              {/* Function name */}
              <div className="col-span-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-medium text-sm cursor-help truncate block">
                      {func.name}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>{func.description}</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Model selector */}
              <div className="col-span-3">
                {func.modelKey ? (
                  <Select 
                    value={currentModel} 
                    onValueChange={(v) => handleModelChange(func, v)}
                    disabled={saving === `model-${func.id}`}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Modelo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {openaiModels.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">
                          {m.length > 30 ? m.substring(0, 30) + '...' : m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              {/* Reasoning selector */}
              <div className="col-span-2">
                {func.reasoningEffortKey ? (
                  <Select 
                    value={currentReasoning} 
                    onValueChange={(v) => handleReasoningChange(func, v)}
                    disabled={saving === `reasoning-${func.id}`}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REASONING_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className={opt.color}>{opt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              {/* Web Search toggle */}
              <div className="col-span-2 flex justify-center">
                {func.webSearchKey ? (
                  <Switch
                    checked={webEnabled}
                    onCheckedChange={(checked) => handleWebSearchToggle(func, checked)}
                    disabled={saving === `web-${func.id}`}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              {/* Prompt button */}
              <div className="col-span-2 flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2"
                  onClick={() => openPromptEditor(func)}
                >
                  <FileText className="w-3.5 h-3.5 mr-1" />
                  {hasPrompt ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <span className="text-xs">Editar</span>
                  )}
                </Button>
              </div>
            </div>
          );
        })}

        {/* Prompt Editor Dialog */}
        <Dialog open={!!editingPrompt} onOpenChange={(open) => !open && setEditingPrompt(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Prompt: {editingPrompt?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {editingPrompt?.description}
              </p>
              <Textarea
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                rows={18}
                className="font-mono text-sm"
                placeholder="Escribe el prompt del sistema..."
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingPrompt(null)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={savePrompt} 
                  disabled={saving === `prompt-${editingPrompt?.id}`}
                >
                  {saving === `prompt-${editingPrompt?.id}` ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
