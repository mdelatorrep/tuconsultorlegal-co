import { useState, useEffect } from 'react';
import { 
  Calculator, RefreshCw, Settings2, Zap, Cpu, MessageSquare, 
  Volume2, Eye, Globe, DollarSign, TrendingUp, Info, Check
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CostConfig {
  id: string;
  config_type: string;
  config_key: string;
  config_name: string;
  cost_multiplier: number;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

interface ToolCostExtended {
  id: string;
  tool_type: string;
  tool_name: string;
  credit_cost: number;
  base_cost: number;
  technology_type: string;
  model_key: string | null;
  reasoning_key: string | null;
  prompt_size_factor: number;
  auto_calculate: boolean;
  is_active: boolean;
  description: string | null;
  // Calculated fields
  model_name?: string;
  reasoning_level?: string;
  calculated_cost?: number;
}

const techIcons: Record<string, typeof MessageSquare> = {
  text: MessageSquare,
  audio: Volume2,
  vision: Eye,
  multimodal: Zap,
  external_api: Globe,
  web_search: Globe
};

export function DynamicCostCalculator() {
  const [costConfigs, setCostConfigs] = useState<CostConfig[]>([]);
  const [toolCosts, setToolCosts] = useState<ToolCostExtended[]>([]);
  const [systemConfigs, setSystemConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CostConfig | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadCostConfigs(),
      loadToolCosts(),
      loadSystemConfigs()
    ]);
    setLoading(false);
  };

  const loadCostConfigs = async () => {
    const { data, error } = await supabase
      .from('cost_calculation_config')
      .select('*')
      .order('config_type')
      .order('display_order');

    if (!error && data) {
      setCostConfigs(data);
    }
  };

  const loadToolCosts = async () => {
    const { data, error } = await supabase
      .from('credit_tool_costs')
      .select('*')
      .order('tool_name');

    if (!error && data) {
      setToolCosts(data as ToolCostExtended[]);
    }
  };

  const loadSystemConfigs = async () => {
    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .or('config_key.ilike.%_model%,config_key.ilike.%reasoning%');

    if (!error && data) {
      const configs: Record<string, string> = {};
      data.forEach(c => { configs[c.config_key] = c.config_value; });
      setSystemConfigs(configs);
    }
  };

  const handleUpdateMultiplier = async (config: CostConfig, newMultiplier: number) => {
    const { error } = await supabase
      .from('cost_calculation_config')
      .update({ cost_multiplier: newMultiplier })
      .eq('id', config.id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el multiplicador', variant: 'destructive' });
      return;
    }

    toast({ title: 'Multiplicador actualizado', description: 'Los costos se recalcularán automáticamente' });
    await loadData();
  };

  const handleRecalculateAll = async () => {
    setRecalculating(true);
    try {
      const { data, error } = await supabase.rpc('recalculate_all_tool_costs');
      
      if (error) throw error;

      const changes = data as Array<{ tool_type: string; old_cost: number; new_cost: number }>;
      
      if (changes && changes.length > 0) {
        toast({
          title: '✅ Costos recalculados',
          description: `Se actualizaron ${changes.length} herramientas`
        });
      } else {
        toast({
          title: 'Sin cambios',
          description: 'Todos los costos ya están actualizados'
        });
      }

      await loadToolCosts();
    } catch (error) {
      console.error('Error recalculating:', error);
      toast({ title: 'Error', description: 'No se pudieron recalcular los costos', variant: 'destructive' });
    } finally {
      setRecalculating(false);
    }
  };

  const handleToggleAutoCalculate = async (tool: ToolCostExtended) => {
    const { error } = await supabase
      .from('credit_tool_costs')
      .update({ auto_calculate: !tool.auto_calculate })
      .eq('id', tool.id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
      return;
    }

    await loadToolCosts();
  };

  const handleUpdateToolConfig = async (tool: ToolCostExtended, updates: Partial<ToolCostExtended>) => {
    const { error } = await supabase
      .from('credit_tool_costs')
      .update(updates)
      .eq('id', tool.id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
      return;
    }

    toast({ title: 'Configuración actualizada' });
    await loadData();
  };

  const getConfigsByType = (type: string) => costConfigs.filter(c => c.config_type === type);
  
  const getModelName = (modelKey: string | null) => {
    if (!modelKey) return '-';
    const modelValue = systemConfigs[modelKey];
    if (!modelValue) return '-';
    const config = costConfigs.find(c => c.config_type === 'model' && c.config_key === modelValue);
    return config?.config_name || modelValue;
  };

  const getReasoningLevel = (reasoningKey: string | null) => {
    if (!reasoningKey) return '-';
    const value = systemConfigs[reasoningKey];
    if (!value) return '-';
    const config = costConfigs.find(c => c.config_type === 'reasoning' && c.config_key === value);
    return config?.config_name || value;
  };

  const getTechnologyName = (techType: string) => {
    const config = costConfigs.find(c => c.config_type === 'technology' && c.config_key === techType);
    return config?.config_name || techType;
  };

  // Calculate estimated platform margin
  const platformMargin = costConfigs.find(c => c.config_key === 'platform_margin')?.cost_multiplier || 3.5;
  const infrastructureOverhead = costConfigs.find(c => c.config_key === 'infrastructure_overhead')?.cost_multiplier || 1.2;
  const effectiveMargin = ((platformMargin * infrastructureOverhead - 1) * 100).toFixed(0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Margen Efectivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-green-600" />
                <span className="text-2xl font-bold text-green-600">{effectiveMargin}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sobre costo base de OpenAI
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Herramientas Activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Settings2 className="h-6 w-6 text-blue-600" />
                <span className="text-2xl font-bold">{toolCosts.filter(t => t.is_active).length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Auto-Cálculo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calculator className="h-6 w-6 text-amber-600" />
                <span className="text-2xl font-bold">{toolCosts.filter(t => t.auto_calculate).length}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Costos dinámicos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Acciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleRecalculateAll} 
                disabled={recalculating}
                className="w-full"
              >
                {recalculating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4 mr-2" />
                )}
                Recalcular Costos
              </Button>
            </CardContent>
          </Card>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Cálculo automático de costos</AlertTitle>
          <AlertDescription>
            Fórmula: <code className="bg-muted px-1 rounded">Costo Base × Modelo × Razonamiento × Tecnología × Tamaño Prompt × Margen Plataforma × Infraestructura</code>
            <br />
            Los costos se recalculan automáticamente cuando cambias la configuración del sistema (modelos, reasoning effort).
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="tools">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tools">
              <Settings2 className="h-4 w-4 mr-2" />
              Herramientas
            </TabsTrigger>
            <TabsTrigger value="models">
              <Cpu className="h-4 w-4 mr-2" />
              Modelos
            </TabsTrigger>
            <TabsTrigger value="reasoning">
              <Zap className="h-4 w-4 mr-2" />
              Razonamiento
            </TabsTrigger>
            <TabsTrigger value="technology">
              <Globe className="h-4 w-4 mr-2" />
              Tecnología
            </TabsTrigger>
            <TabsTrigger value="margins">
              <DollarSign className="h-4 w-4 mr-2" />
              Márgenes
            </TabsTrigger>
          </TabsList>

          {/* Tools Tab */}
          <TabsContent value="tools" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Costos por Herramienta</CardTitle>
                <CardDescription>
                  Ajusta los parámetros que determinan el costo de cada herramienta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Herramienta</TableHead>
                        <TableHead>Tecnología</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Reasoning</TableHead>
                        <TableHead className="text-center">Base</TableHead>
                        <TableHead className="text-center">Factor Prompt</TableHead>
                        <TableHead className="text-center">Auto</TableHead>
                        <TableHead className="text-right">Costo Final</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {toolCosts.map((tool) => {
                        const TechIcon = techIcons[tool.technology_type] || MessageSquare;
                        return (
                          <TableRow key={tool.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{tool.tool_name}</p>
                                <code className="text-xs text-muted-foreground">{tool.tool_type}</code>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <TechIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{getTechnologyName(tool.technology_type)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{getModelName(tool.model_key)}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{getReasoningLevel(tool.reasoning_key)}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                value={tool.base_cost}
                                onChange={(e) => handleUpdateToolConfig(tool, { base_cost: parseInt(e.target.value) || 1 })}
                                className="w-16 text-center"
                                min={1}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                value={tool.prompt_size_factor}
                                onChange={(e) => handleUpdateToolConfig(tool, { prompt_size_factor: parseFloat(e.target.value) || 1 })}
                                className="w-20 text-center"
                                min={0.1}
                                max={5}
                                step={0.1}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Switch
                                      checked={tool.auto_calculate}
                                      onCheckedChange={() => handleToggleAutoCalculate(tool)}
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {tool.auto_calculate 
                                    ? 'Costo se calcula automáticamente' 
                                    : 'Costo fijo manual'}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge 
                                className={tool.auto_calculate 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-amber-100 text-amber-800'}
                              >
                                {tool.credit_cost} créditos
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Models Tab */}
          <TabsContent value="models" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Multiplicadores por Modelo</CardTitle>
                <CardDescription>
                  Define el factor de costo relativo de cada modelo de IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {getConfigsByType('model').map((config) => (
                    <div key={config.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{config.config_name}</p>
                          <code className="text-xs text-muted-foreground">{config.config_key}</code>
                        </div>
                        <Badge variant="outline" className="text-lg">
                          {config.cost_multiplier}x
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[config.cost_multiplier]}
                          onValueChange={([val]) => setEditingConfig({ ...config, cost_multiplier: val })}
                          onValueCommit={([val]) => handleUpdateMultiplier(config, val)}
                          min={0.1}
                          max={5}
                          step={0.1}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={editingConfig?.id === config.id ? editingConfig.cost_multiplier : config.cost_multiplier}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0.1;
                            setEditingConfig({ ...config, cost_multiplier: val });
                          }}
                          onBlur={() => {
                            if (editingConfig?.id === config.id) {
                              handleUpdateMultiplier(config, editingConfig.cost_multiplier);
                            }
                          }}
                          className="w-20"
                          min={0.1}
                          max={10}
                          step={0.1}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reasoning Tab */}
          <TabsContent value="reasoning" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Multiplicadores por Esfuerzo de Razonamiento</CardTitle>
                <CardDescription>
                  Mayor esfuerzo de razonamiento = mayor consumo de tokens y costo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {getConfigsByType('reasoning').map((config) => (
                    <div key={config.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{config.config_name}</p>
                        <Badge variant="outline" className="text-lg">
                          {config.cost_multiplier}x
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[config.cost_multiplier]}
                          onValueCommit={([val]) => handleUpdateMultiplier(config, val)}
                          min={1}
                          max={5}
                          step={0.1}
                          className="flex-1"
                        />
                        <span className="text-lg font-mono w-12">{config.cost_multiplier}x</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Technology Tab */}
          <TabsContent value="technology" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Multiplicadores por Tipo de Tecnología</CardTitle>
                <CardDescription>
                  Diferentes tecnologías tienen diferentes costos de procesamiento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {getConfigsByType('technology').map((config) => {
                    const TechIcon = techIcons[config.config_key] || MessageSquare;
                    return (
                      <div key={config.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TechIcon className="h-5 w-5 text-primary" />
                            <p className="font-medium">{config.config_name}</p>
                          </div>
                          <Badge variant="outline" className="text-lg">
                            {config.cost_multiplier}x
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[config.cost_multiplier]}
                            onValueCommit={([val]) => handleUpdateMultiplier(config, val)}
                            min={0.5}
                            max={5}
                            step={0.1}
                            className="flex-1"
                          />
                          <span className="text-lg font-mono w-12">{config.cost_multiplier}x</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Margins Tab */}
          <TabsContent value="margins" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Márgenes y Rentabilidad</CardTitle>
                <CardDescription>
                  Ajusta los márgenes para asegurar la rentabilidad de la plataforma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="bg-green-50 border-green-200">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Margen Efectivo Actual: {effectiveMargin}%</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Este margen cubre costos operativos, infraestructura, soporte y genera rentabilidad.
                    Un margen del 300-400% es recomendado para SaaS B2B.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-6 md:grid-cols-2">
                  {getConfigsByType('margin').map((config) => (
                    <div key={config.id} className="border rounded-lg p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-lg">{config.config_name}</p>
                          <code className="text-xs text-muted-foreground">{config.config_key}</code>
                        </div>
                        <Badge className="text-xl bg-primary">
                          {config.cost_multiplier}x
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>1x (sin margen)</span>
                          <span>10x (alto margen)</span>
                        </div>
                        <Slider
                          value={[config.cost_multiplier]}
                          onValueCommit={([val]) => handleUpdateMultiplier(config, val)}
                          min={1}
                          max={10}
                          step={0.1}
                          className="py-4"
                        />
                        <div className="flex items-center gap-4 mt-4">
                          <Label>Multiplicador exacto:</Label>
                          <Input
                            type="number"
                            value={config.cost_multiplier}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 1;
                              handleUpdateMultiplier(config, val);
                            }}
                            className="w-24"
                            min={1}
                            max={20}
                            step={0.1}
                          />
                        </div>
                      </div>

                      {config.config_key === 'platform_margin' && (
                        <div className="bg-muted/50 rounded p-3 text-sm">
                          <p className="font-medium mb-1">¿Qué cubre este margen?</p>
                          <ul className="text-muted-foreground space-y-1">
                            <li>• Costos de servidores y CDN</li>
                            <li>• Desarrollo y mantenimiento</li>
                            <li>• Soporte al cliente</li>
                            <li>• Marketing y adquisición</li>
                            <li>• Rentabilidad del negocio</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Cost Breakdown Example */}
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-base">Ejemplo de Cálculo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Costo base OpenAI (ejemplo):</span>
                        <span className="font-mono">$0.002 USD</span>
                      </div>
                      <div className="flex justify-between">
                        <span>× Margen plataforma ({platformMargin}x):</span>
                        <span className="font-mono">${(0.002 * platformMargin).toFixed(4)} USD</span>
                      </div>
                      <div className="flex justify-between">
                        <span>× Infraestructura ({infrastructureOverhead}x):</span>
                        <span className="font-mono">${(0.002 * platformMargin * infrastructureOverhead).toFixed(4)} USD</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>Precio final al usuario:</span>
                        <span className="font-mono text-primary">${(0.002 * platformMargin * infrastructureOverhead).toFixed(4)} USD</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Margen bruto:</span>
                        <span className="font-mono">{effectiveMargin}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
