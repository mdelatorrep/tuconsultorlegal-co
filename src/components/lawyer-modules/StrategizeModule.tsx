import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Target, AlertTriangle, CheckCircle, Scale, Loader2, Sparkles, TrendingUp, Clock, Lightbulb, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import UnifiedSidebar from "../UnifiedSidebar";

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
  const { toast } = useToast();

  const handleStrategicAnalysis = async () => {
    if (!caseDescription.trim()) {
      toast({
        title: "Descripción requerida",
        description: "Por favor describe los hechos del caso para analizar.",
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

      const strategyResult: StrategicAnalysis = {
        caseDescription: data.caseDescription,
        legalActions: data.legalActions,
        legalArguments: data.legalArguments,
        counterarguments: data.counterarguments,
        precedents: data.precedents,
        recommendations: data.recommendations,
        timestamp: data.timestamp
      };

      setAnalyses(prev => [strategyResult, ...prev]);
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-purple-500/5">
        <UnifiedSidebar 
          user={user}
          currentView={currentView}
          onViewChange={onViewChange}
          onLogout={onLogout}
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Enhanced Header - Mobile First */}
          <header className="h-14 lg:h-16 border-b bg-gradient-to-r from-background/95 to-purple-500/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 relative overflow-hidden sticky top-0 z-40">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-50"></div>
            <div className="relative flex h-14 lg:h-16 items-center px-3 lg:px-6">
              <SidebarTrigger className="mr-2 lg:mr-4 hover:bg-purple-500/10 rounded-lg p-2 transition-all duration-200 flex-shrink-0" />
              <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                <div className="p-1.5 lg:p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg lg:rounded-xl shadow-lg flex-shrink-0">
                  <Lightbulb className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base lg:text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent truncate">
                    Estrategia Legal IA
                  </h1>
                  <p className="text-xs lg:text-sm text-muted-foreground hidden sm:block truncate">
                    Planificación inteligente de casos
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 lg:py-8">
            <div className="max-w-7xl mx-auto">
              <div className="space-y-4 lg:space-y-8">
                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 p-8">
                  <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                  <div className="relative">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-2xl">
                        <Brain className="h-10 w-10 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 bg-clip-text text-transparent">
                          Centro de Estrategia Legal
                        </h2>
                        <p className="text-lg text-muted-foreground mt-2">
                          Análisis estratégico avanzado, planificación de casos y desarrollo de argumentos
                        </p>
                      </div>
                    </div>
                    
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <Target className="h-8 w-8 text-purple-600" />
                          <div>
                            <p className="text-2xl font-bold text-purple-600">{analyses.length}</p>
                            <p className="text-sm text-muted-foreground">Estrategias desarrolladas</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-8 w-8 text-emerald-600" />
                          <div>
                            <p className="text-2xl font-bold text-emerald-600">92%</p>
                            <p className="text-sm text-muted-foreground">Éxito estratégico</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <Clock className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="text-2xl font-bold text-blue-600">5 min</p>
                            <p className="text-sm text-muted-foreground">Análisis completo</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Analysis Interface */}
                <Card className="border-0 shadow-2xl bg-gradient-to-br from-white via-white to-purple-500/5 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-purple-500/10 opacity-50"></div>
                  <CardHeader className="relative pb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                          Análisis Estratégico de Caso
                        </CardTitle>
                        <CardDescription className="text-base mt-2">
                          Describe los hechos del caso para obtener un análisis estratégico integral con argumentos y tácticas
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-purple-700">Descripción detallada del caso</label>
                      <Textarea
                        placeholder="Proporciona un análisis detallado incluyendo: hechos relevantes, partes involucradas, problema jurídico central, pretensiones, marco normativo aplicable, y cualquier circunstancia especial que pueda influir en la estrategia legal..."
                        value={caseDescription}
                        onChange={(e) => setCaseDescription(e.target.value)}
                        rows={7}
                        className="resize-none border-purple-200 focus:border-purple-400 rounded-xl bg-white/80 backdrop-blur-sm text-base"
                      />
                      <p className="text-xs text-muted-foreground">
                        💡 Incluye información sobre precedentes, evidencias disponibles y objetivos del cliente para un análisis más preciso
                      </p>
                    </div>
                    
                    <Button
                      onClick={handleStrategicAnalysis}
                      disabled={isAnalyzing}
                      className="w-full h-14 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-500 shadow-xl hover:shadow-2xl transition-all duration-300 text-lg font-semibold"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                          <span className="animate-pulse">Desarrollando estrategia...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-3" />
                          Generar Estrategia Integral
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
                  <CardTitle>Análisis del Caso</CardTitle>
                  <CardDescription>
                    {analysis.caseDescription.length > 150 
                      ? `${analysis.caseDescription.substring(0, 150)}...` 
                      : analysis.caseDescription
                    }
                  </CardDescription>
                  <Badge variant="outline">
                    {new Date(analysis.timestamp).toLocaleDateString()}
                  </Badge>
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
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-gray-50 to-gray-100 overflow-hidden">
                    <CardContent className="p-12 text-center">
                      <div className="space-y-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-400/10 rounded-full blur-2xl"></div>
                          <div className="relative p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-2xl mx-auto w-fit">
                            <Brain className="h-16 w-16 text-white" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Desarrolla tu estrategia legal!</h3>
                          <p className="text-lg text-muted-foreground max-w-md mx-auto">
                            Obtén análisis estratégicos completos con argumentos, precedentes y tácticas para maximizar tus posibilidades de éxito
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-purple-500/10 to-purple-400/5 rounded-xl p-4 max-w-lg mx-auto">
                          <p className="text-sm text-purple-700 font-medium">
                            🎯 Análisis de viabilidad, argumentos jurídicos y estrategias de negociación
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}