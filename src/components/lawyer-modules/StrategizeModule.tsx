import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Brain, Target, AlertTriangle, CheckCircle, Scale, Loader2, Sparkles, TrendingUp, Clock, Lightbulb, Shield, History, ChevronRight, Coins, Briefcase, Download } from "lucide-react";
import { exportStrategyToPdf } from "@/utils/aiResultPdfExporter";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import { ToolCostIndicator } from "@/components/credits/ToolCostIndicator";
import { CaseSelectorDropdown } from "./CaseSelectorDropdown";
import { useCaseActivityLogger } from "@/hooks/useCaseActivityLogger";
import { QuickPromptSuggestions } from "@/components/ui/QuickPromptSuggestions";

interface StrategizeModuleProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

interface StrategicAnalysis {
  caseDescription: string;
  legalActions: {
    action: string;
    viability: 'high' | 'medium' | 'low';
    description: string;
    requirements: string[];
  }[];
  legalArguments: {
    argument: string;
    foundation: string;
    strength: 'strong' | 'moderate' | 'weak';
  }[];
  counterarguments: {
    argument: string;
    response: string;
    mitigation: string;
  }[];
  precedents: {
    case: string;
    relevance: string;
    outcome: string;
  }[];
  recommendations: string[];
  timestamp: string;
}

export default function StrategizeModule({ user, currentView, onViewChange, onLogout }: StrategizeModuleProps) {
  const [caseDescription, setCaseDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyses, setAnalyses] = useState<StrategicAnalysis[]>([]);
  const [activeTab, setActiveTab] = useState("strategize");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCaseData, setSelectedCaseData] = useState<any>(null);
  const { toast } = useToast();
  const { consumeCredits, hasEnoughCredits, getToolCost } = useCredits(user?.id);
  const { logAIToolUsage } = useCaseActivityLogger();

  // Load strategy history on mount
  useEffect(() => {
    loadStrategyHistory();
  }, [user.id]);

  const loadStrategyHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_tools_results')
        .select('*')
        .eq('lawyer_id', user.id)
        .eq('tool_type', 'strategy')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const history = data?.map((item: any) => {
        const out = item.output_data || {};
        const safeArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
        const safeString = (v: any, fallback: string) => (typeof v === 'string' ? v : fallback);

        return {
          caseDescription: safeString(item.input_data?.caseDescription, 'Caso analizado'),
          legalActions: safeArray(out?.legalActions),
          legalArguments: safeArray(out?.legalArguments),
          counterarguments: safeArray(out?.counterarguments),
          precedents: safeArray(out?.precedents),
          recommendations: safeArray(out?.recommendations),
          timestamp: item.created_at
        } as StrategicAnalysis;
      }) || [];

      setAnalyses(history);
    } catch (error) {
      console.error('Error loading strategy history:', error);
    }
  };

  const handleStrategicAnalysis = async () => {
    if (!caseDescription.trim()) {
      toast({
        title: "Descripción requerida",
        description: "Por favor describe los hechos del caso para analizar.",
        variant: "destructive",
      });
      return;
    }

    // Check credits availability before proceeding (consume after success)
    if (!hasEnoughCredits('strategy')) {
      toast({
        title: "Créditos insuficientes",
        description: `Necesitas ${getToolCost('strategy')} créditos para el análisis estratégico.`,
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Call the legal strategy analysis function
      const { data, error } = await supabase.functions.invoke('legal-strategy-analysis', {
        body: { caseDescription }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Error en el análisis estratégico');
      }

      // Consume credits only after successful API response
      await consumeCredits('strategy', { caseDescription: caseDescription.substring(0, 100) });

      const safeArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
      const safeString = (v: any, fallback: string) => (typeof v === 'string' ? v : fallback);

      const strategyResult: StrategicAnalysis = {
        caseDescription: safeString(data.caseDescription, caseDescription),
        legalActions: safeArray(data.legalActions),
        legalArguments: safeArray(data.legalArguments),
        counterarguments: safeArray(data.counterarguments),
        precedents: safeArray(data.precedents),
        recommendations: safeArray(data.recommendations),
        timestamp: data.timestamp
      };

      setAnalyses(prev => [strategyResult, ...prev]);
      loadStrategyHistory(); // Reload history
      setCaseDescription("");
      
      toast({
        title: "Análisis estratégico completado",
        description: "Se generó una estrategia legal integral para el caso.",
      });
    } catch (error) {
      console.error("Error en análisis estratégico:", error);
      toast({
        title: "Error en el análisis",
        description: "Hubo un problema al procesar el caso.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getViabilityBadge = (viability: 'high' | 'medium' | 'low') => {
    switch (viability) {
      case 'high':
        return <Badge className="bg-green-100 text-green-800">Alta Viabilidad</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Viabilidad Media</Badge>;
      case 'low':
        return <Badge className="bg-red-100 text-red-800">Baja Viabilidad</Badge>;
    }
  };

  const getStrengthBadge = (strength: 'strong' | 'moderate' | 'weak') => {
    switch (strength) {
      case 'strong':
        return <Badge className="bg-green-100 text-green-800">Fuerte</Badge>;
      case 'moderate':
        return <Badge className="bg-yellow-100 text-yellow-800">Moderado</Badge>;
      case 'weak':
        return <Badge className="bg-red-100 text-red-800">Débil</Badge>;
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="strategize" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Nuevo Análisis
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial ({analyses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="strategize" className="space-y-4">
          {/* Analysis Interface */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base font-semibold">Análisis Estratégico de Caso</CardTitle>
                  <CardDescription className="text-sm">
                    Describe los hechos del caso para obtener argumentos, tácticas y precedentes
                  </CardDescription>
                </div>
                <ToolCostIndicator toolType="strategy" lawyerId={user.id} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Descripción detallada del caso</label>
                <Textarea
                  placeholder="Incluye hechos relevantes, partes involucradas, problema jurídico central, pretensiones y marco normativo aplicable..."
                  value={caseDescription}
                  onChange={(e) => setCaseDescription(e.target.value)}
                  rows={4}
                className="resize-none"
                />
                {!caseDescription.trim() && !isAnalyzing && (
                  <QuickPromptSuggestions
                    suggestions={[
                      "Trabajador despedido durante incapacidad médica. Empleador alega bajo rendimiento. 3 años de antigüedad.",
                      "Sociedad comercial incumple contrato de distribución exclusiva. Pérdidas por $200M. Cláusula penal pactada.",
                      "Vecino construye sobre servidumbre de paso. Escritura registrada hace 15 años. Mediación fallida.",
                      "Empresa multada por DIAN por diferencias en declaración de renta. Sanción de $50M. Plazo para recurrir vence en 5 días.",
                    ]}
                    onSelect={(s) => setCaseDescription(s)}
                    disabled={isAnalyzing}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  💡 Incluye precedentes, evidencias y objetivos del cliente para mayor precisión
                </p>
              </div>
              
              <Button
                onClick={handleStrategicAnalysis}
                disabled={isAnalyzing || !hasEnoughCredits('strategy')}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Desarrollando estrategia...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generar Estrategia
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

      {/* Analysis Results */}
      {analyses.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Análisis Estratégicos</h3>
          {analyses.map((analysis, index) => (
            <div key={index} className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle>Análisis del Caso</CardTitle>
                      <CardDescription>
                        {analysis.caseDescription.length > 150 
                          ? `${analysis.caseDescription.substring(0, 150)}...` 
                          : analysis.caseDescription
                        }
                      </CardDescription>
                      <Badge variant="outline" className="mt-2">
                        {new Date(analysis.timestamp).toLocaleDateString()}
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="text-xs">Completado</Badge>
                  </div>
                </CardHeader>
              </Card>

              {/* Legal Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    Vías de Acción Legal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.legalActions.map((action, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{action.action}</h4>
                          {getViabilityBadge(action.viability)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {action.description}
                        </p>
                        <div>
                          <h5 className="text-sm font-medium mb-2">Requisitos:</h5>
                          <ul className="text-sm space-y-1">
                            {action.requirements.map((req, reqIdx) => (
                              <li key={reqIdx} className="flex items-start gap-2">
                                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Legal Arguments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Argumentos Jurídicos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.legalArguments.map((arg, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{arg.argument}</h4>
                          {getStrengthBadge(arg.strength)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <strong>Fundamento:</strong> {arg.foundation}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Counter Arguments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Posibles Contraargumentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.counterarguments.map((counter, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">{counter.argument}</h4>
                        <div className="space-y-2 text-sm">
                          <p><strong>Respuesta:</strong> {counter.response}</p>
                          <p><strong>Mitigación:</strong> {counter.mitigation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Precedents */}
              <Card>
                <CardHeader>
                  <CardTitle>Precedentes Relevantes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.precedents.map((precedent, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <h4 className="font-semibold">{precedent.case}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Relevancia:</strong> {precedent.relevance}
                        </p>
                        <p className="text-sm mt-1">
                          <strong>Resultado:</strong> {precedent.outcome}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recomendaciones Estratégicas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysis.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

                {analyses.length === 0 && !isAnalyzing && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <h3 className="text-lg font-semibold mb-1">¡Desarrolla tu estrategia legal!</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Obtén análisis estratégicos con argumentos, precedentes y tácticas
                      </p>
                    </CardContent>
                  </Card>
                )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  {analyses.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No hay estrategias previas</h3>
                        <p className="text-muted-foreground">
                          Los análisis estratégicos aparecerán aquí cuando completes tu primer análisis
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-muted/50 border rounded-xl">
                        <h3 className="text-lg font-bold">
                          Historial de Estrategias
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {analyses.length} análisis estratégico{analyses.length !== 1 ? 's' : ''} completado{analyses.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {analyses.map((analysis, index) => (
                        <Collapsible key={index}>
                          <Card className="hover:shadow-lg transition-shadow">
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <CardDescription className="mb-2 flex items-center gap-2">
                                      <Clock className="h-3 w-3" />
                                      {new Date(analysis.timestamp).toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </CardDescription>
                                    <p className="text-sm line-clamp-2 text-gray-700">
                                      {analysis.caseDescription}
                                    </p>
                                  </div>
                                  <ChevronRight className="h-5 w-5 text-purple-600 flex-shrink-0" />
                                </div>
                                <div className="grid grid-cols-4 gap-2 mt-4">
                                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                    <Target className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                                    <p className="text-lg font-bold">{analysis.legalActions.length}</p>
                                    <p className="text-xs text-muted-foreground">Acciones</p>
                                  </div>
                                  <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                    <Scale className="h-4 w-4 mx-auto mb-1 text-green-600" />
                                    <p className="text-lg font-bold">{analysis.legalArguments.length}</p>
                                    <p className="text-xs text-muted-foreground">Argumentos</p>
                                  </div>
                                  <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                                    <Shield className="h-4 w-4 mx-auto mb-1 text-orange-600" />
                                    <p className="text-lg font-bold">{analysis.counterarguments.length}</p>
                                    <p className="text-xs text-muted-foreground">Contraarg.</p>
                                  </div>
                                  <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                                    <Lightbulb className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                                    <p className="text-lg font-bold">{analysis.recommendations.length}</p>
                                    <p className="text-xs text-muted-foreground">Recomend.</p>
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <CardContent className="pt-0 space-y-4">
                                {/* Legal Actions */}
                                {analysis.legalActions.length > 0 && (
                                  <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                      <Target className="h-4 w-4 text-blue-600" />
                                      Vías de Acción Legal
                                    </h4>
                                    <div className="space-y-2">
                                      {analysis.legalActions.map((action: any, idx: number) => (
                                        <div key={idx} className="bg-blue-50 p-3 rounded-lg">
                                          <p className="font-medium text-sm">{action.action}</p>
                                          <Badge variant="outline" className="mt-1">{action.viability}</Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Recommendations */}
                                {analysis.recommendations.length > 0 && (
                                  <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                      <Lightbulb className="h-4 w-4 text-purple-600" />
                                      Recomendaciones
                                    </h4>
                                    <ul className="space-y-2">
                                      {analysis.recommendations.map((rec: string, idx: number) => (
                                        <li key={idx} className="text-sm flex items-start gap-2">
                                          <span className="text-purple-600 mt-1">•</span>
                                          <span>{rec}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </CardContent>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      ))}
                    </div>
                  )}
                </TabsContent>
      </Tabs>
    </div>
  );
}