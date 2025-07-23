import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Target, AlertTriangle, CheckCircle, Scale, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function StrategizeModule() {
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
      // Simulated strategic analysis - In production, this would use advanced AI
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const mockAnalysis: StrategicAnalysis = {
        caseDescription,
        legalActions: [
          {
            action: "Acción de Protección al Consumidor",
            viability: 'high',
            description: "Demanda ante la Superintendencia de Industria y Comercio por prácticas comerciales abusivas",
            requirements: [
              "Prueba de la relación de consumo",
              "Evidencia de las prácticas abusivas",
              "Documentación de los perjuicios causados"
            ]
          },
          {
            action: "Demanda por Incumplimiento Contractual",
            viability: 'medium',
            description: "Acción ordinaria de incumplimiento ante jurisdicción civil",
            requirements: [
              "Contrato válido y vigente",
              "Prueba del incumplimiento",
              "Cuantificación de los daños"
            ]
          },
          {
            action: "Acción de Grupo",
            viability: 'low',
            description: "Si hay múltiples afectados con situación similar",
            requirements: [
              "Mínimo 20 personas afectadas",
              "Daño común y homogéneo",
              "Causa común del daño"
            ]
          }
        ],
        legalArguments: [
          {
            argument: "Violación del principio de buena fe contractual",
            foundation: "Artículo 1603 del Código Civil y artículo 871 del Código de Comercio",
            strength: 'strong'
          },
          {
            argument: "Práctica comercial abusiva",
            foundation: "Ley 1480 de 2011 - Estatuto del Consumidor, artículo 23",
            strength: 'strong'
          },
          {
            argument: "Enriquecimiento sin causa",
            foundation: "Artículo 2042 del Código Civil",
            strength: 'moderate'
          }
        ],
        counterarguments: [
          {
            argument: "La contraparte puede alegar fuerza mayor o caso fortuito",
            response: "Demostrar que las circunvencias eran previsibles y estaban dentro del control de la contraparte",
            mitigation: "Presentar evidencia de negligencia o falta de diligencia en la gestión de riesgos"
          },
          {
            argument: "Prescripción de la acción",
            response: "Verificar términos de prescripción según el tipo de acción (3 años para responsabilidad civil)",
            mitigation: "Documentar fechas exactas de conocimiento del daño e interrupción de prescripción"
          }
        ],
        precedents: [
          {
            case: "Corte Suprema de Justicia - Sentencia SC4360-2018",
            relevance: "Interpretación de cláusulas abusivas en contratos de adhesión",
            outcome: "Favorable: Declaró nulidad de cláusulas leoninas"
          },
          {
            case: "Consejo de Estado - Radicado 11001-03-24-000-2019-00215-00",
            relevance: "Responsabilidad por información deficiente al consumidor",
            outcome: "Favorable: Ordenó indemnización por daños causados"
          }
        ],
        recommendations: [
          "Iniciar con acción de protección al consumidor por mayor probabilidad de éxito",
          "Recopilar evidencia documental completa antes de presentar demanda",
          "Considerar mediación previa para reducir costos y tiempo",
          "Evaluar garantías o seguros disponibles para recuperación",
          "Documentar todos los perjuicios económicos y morales sufridos"
        ],
        timestamp: new Date().toISOString()
      };

      setAnalyses(prev => [mockAnalysis, ...prev]);
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
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold text-primary">Asistente Estratégico</h2>
          <p className="text-muted-foreground">
            Análisis estratégico integral de casos legales con IA
          </p>
        </div>
      </div>

      {/* Analysis Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Nuevo Análisis Estratégico
          </CardTitle>
          <CardDescription>
            Describe los hechos del caso para obtener un análisis estratégico completo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Describe detalladamente los hechos del caso, las partes involucradas, el problema legal y cualquier información relevante que permita un análisis estratégico completo..."
            value={caseDescription}
            onChange={(e) => setCaseDescription(e.target.value)}
            rows={6}
            className="resize-none"
          />
          <Button
            onClick={handleStrategicAnalysis}
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analizando estrategia...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generar Análisis Estratégico
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

      {analyses.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Inicia tu primer análisis estratégico de caso
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}