import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Brain, FileText, Search, Scale, Gavel, MessageCircle,
  TrendingUp, TrendingDown, Coins, Activity, BarChart3,
  Zap, AlertCircle, CheckCircle
} from "lucide-react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";

interface ToolUsage {
  tool_type: string;
  tool_name: string;
  uses_7d: number;
  uses_30d: number;
  credits_consumed: number;
  percentage: number;
  trend: number;
  icon: any;
}

interface ToolCost {
  tool_type: string;
  tool_name: string;
  credit_cost: number;
  description: string;
}

export const AIToolsAnalytics = () => {
  const [toolUsages, setToolUsages] = useState<ToolUsage[]>([]);
  const [toolCosts, setToolCosts] = useState<ToolCost[]>([]);
  const [totalUsage, setTotalUsage] = useState({ uses_7d: 0, uses_30d: 0, credits: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [unusedTools, setUnusedTools] = useState<string[]>([]);

  const toolIcons: Record<string, any> = {
    'redaccion_legal': FileText,
    'investigacion_legal': Search,
    'analisis_documentos': Brain,
    'estrategia_legal': Scale,
    'predictor_casos': Gavel,
    'consulta_procesos': MessageCircle,
    'monitor_procesos': Activity,
    'suin_juriscol': Search,
    'verificacion_profesional': CheckCircle,
    'copilot': Zap,
  };

  const toolNames: Record<string, string> = {
    'redaccion_legal': 'Redacción Legal',
    'investigacion_legal': 'Investigación Legal IA',
    'analisis_documentos': 'Análisis de Documentos',
    'estrategia_legal': 'Estrategia Legal',
    'predictor_casos': 'Predictor de Casos',
    'consulta_procesos': 'Consulta Procesos Judiciales',
    'monitor_procesos': 'Monitor de Procesos',
    'suin_juriscol': 'SUIN Juriscol',
    'verificacion_profesional': 'Verificación Profesional',
    'copilot': 'Legal Copilot',
  };

  // Map description keywords to tool types
  const descriptionToToolType: Record<string, string> = {
    'Redacción Legal': 'redaccion_legal',
    'Investigación Legal': 'investigacion_legal',
    'Análisis de Documentos': 'analisis_documentos',
    'Estrategia Legal': 'estrategia_legal',
    'Predictor de Casos': 'predictor_casos',
    'Consulta Procesos Judiciales': 'consulta_procesos',
    'Monitor de Procesos': 'monitor_procesos',
    'SUIN Juriscol': 'suin_juriscol',
    'Verificación Profesional': 'verificacion_profesional',
    'Legal Copilot': 'copilot',
  };

  useEffect(() => {
    loadToolAnalytics();
  }, []);

  const loadToolAnalytics = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const sevenDaysAgo = subDays(now, 7);
      const thirtyDaysAgo = subDays(now, 30);

      // Fetch tool costs configuration
      const { data: costs } = await supabase
        .from('credit_tool_costs')
        .select('*')
        .eq('is_active', true);

      if (costs) {
        setToolCosts(costs);
      }

      // Fetch credit transactions (which represent tool usage)
      // Using 'usage' transaction_type which is what the app actually uses
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('transaction_type', 'usage')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Calculate usage by tool type
      const usageByTool: Record<string, { uses_7d: number; uses_30d: number; credits: number }> = {};

      // Initialize all known tools
      Object.keys(toolNames).forEach(tool => {
        usageByTool[tool] = { uses_7d: 0, uses_30d: 0, credits: 0 };
      });

      // Helper function to extract tool type from description
      const getToolTypeFromDescription = (description: string | null): string => {
        if (!description) return 'unknown';
        for (const [keyword, toolType] of Object.entries(descriptionToToolType)) {
          if (description.includes(keyword)) {
            return toolType;
          }
        }
        return 'unknown';
      };

      // Count transactions
      transactions?.forEach(tx => {
        const toolType = getToolTypeFromDescription(tx.description);
        if (!usageByTool[toolType]) {
          usageByTool[toolType] = { uses_7d: 0, uses_30d: 0, credits: 0 };
        }

        const txDate = new Date(tx.created_at);
        usageByTool[toolType].uses_30d++;
        usageByTool[toolType].credits += Math.abs(tx.amount);

        if (txDate >= sevenDaysAgo) {
          usageByTool[toolType].uses_7d++;
        }
      });

      // Calculate totals
      const total_7d = Object.values(usageByTool).reduce((sum, t) => sum + t.uses_7d, 0);
      const total_30d = Object.values(usageByTool).reduce((sum, t) => sum + t.uses_30d, 0);
      const total_credits = Object.values(usageByTool).reduce((sum, t) => sum + t.credits, 0);

      setTotalUsage({ uses_7d: total_7d, uses_30d: total_30d, credits: total_credits });

      // Convert to array with percentages and trends
      const toolUsageArray: ToolUsage[] = Object.entries(usageByTool)
        .map(([tool_type, data]) => ({
          tool_type,
          tool_name: toolNames[tool_type] || tool_type,
          uses_7d: data.uses_7d,
          uses_30d: data.uses_30d,
          credits_consumed: data.credits,
          percentage: total_30d > 0 ? (data.uses_30d / total_30d) * 100 : 0,
          trend: data.uses_30d > 0 ? ((data.uses_7d * 4.3) - data.uses_30d) / data.uses_30d * 100 : 0,
          icon: toolIcons[tool_type] || Brain
        }))
        .sort((a, b) => b.uses_30d - a.uses_30d);

      setToolUsages(toolUsageArray);

      // Find unused tools
      const unused = toolUsageArray
        .filter(t => t.uses_30d === 0)
        .map(t => t.tool_name);
      setUnusedTools(unused);

    } catch (error) {
      console.error('Error loading tool analytics:', error);
    } finally {
      setIsLoading(false);
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6" />
          Analytics de Herramientas IA
        </h2>
        <p className="text-muted-foreground">
          Uso y rendimiento de las herramientas de inteligencia artificial
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Usos (7 días)</p>
                <p className="text-3xl font-bold">{totalUsage.uses_7d}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Usos (30 días)</p>
                <p className="text-3xl font-bold">{totalUsage.uses_30d}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Créditos Consumidos</p>
                <p className="text-3xl font-bold">{totalUsage.credits}</p>
              </div>
              <Coins className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Herramientas Sin Uso</p>
                <p className="text-3xl font-bold">{unusedTools.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unused Tools Alert */}
      {unusedTools.length > 0 && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium">Herramientas sin uso en los últimos 30 días</p>
                <p className="text-sm text-muted-foreground">
                  {unusedTools.join(', ')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Considera promocionar estas herramientas o revisar si son necesarias.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tools Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle>Uso por Herramienta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {toolUsages.map((tool, index) => {
              const Icon = tool.icon;
              const isGrowing = tool.trend > 0;
              return (
                <div key={tool.tool_type} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3 w-48">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tool.tool_name}</p>
                      <p className="text-xs text-muted-foreground">{tool.tool_type}</p>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold">{tool.uses_7d}</p>
                      <p className="text-xs text-muted-foreground">7 días</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{tool.uses_30d}</p>
                      <p className="text-xs text-muted-foreground">30 días</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{tool.credits_consumed}</p>
                      <p className="text-xs text-muted-foreground">Créditos</p>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      {isGrowing ? (
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${isGrowing ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isGrowing ? '+' : ''}{tool.trend.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="w-32">
                    <Progress value={tool.percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      {tool.percentage.toFixed(1)}% del total
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tool Costs Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Configuración de Costos por Herramienta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {toolCosts.map((cost) => {
              const Icon = toolIcons[cost.tool_type] || Brain;
              return (
                <div key={cost.tool_type} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{cost.tool_name}</p>
                    <p className="text-xs text-muted-foreground">{cost.description}</p>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Coins className="w-3 h-3" />
                    {cost.credit_cost}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
