import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Brain, Target, Scale, Shield, Lightbulb, ChevronRight, FileText } from "lucide-react";

interface StrategicAnalysis {
  caseDescription: string;
  legalActions: any[];
  legalArguments: any[];
  counterarguments: any[];
  precedents: any[];
  recommendations: string[];
  timestamp: string;
}

interface StrategyHistoryProps {
  history: StrategicAnalysis[];
}

export default function StrategyHistory({ history }: StrategyHistoryProps) {
  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay estrategias previas</h3>
          <p className="text-muted-foreground">
            Los análisis estratégicos aparecerán aquí
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((analysis, index) => (
        <Collapsible key={index}>
          <Card className="hover:shadow-lg transition-shadow">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-blue-50/50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardDescription className="mb-2">
                      {new Date(analysis.timestamp).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </CardDescription>
                    <p className="text-sm line-clamp-2 font-medium">
                      {analysis.caseDescription}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-blue-600 flex-shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <Target className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                    <p className="text-lg font-bold">{analysis.legalActions.length}</p>
                    <p className="text-xs text-muted-foreground">Acciones</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <Scale className="h-4 w-4 mx-auto mb-1 text-green-600" />
                    <p className="text-lg font-bold">{analysis.legalArguments.length}</p>
                    <p className="text-xs text-muted-foreground">Argumentos</p>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded-lg">
                    <Shield className="h-4 w-4 mx-auto mb-1 text-orange-600" />
                    <p className="text-lg font-bold">{analysis.counterarguments.length}</p>
                    <p className="text-xs text-muted-foreground">Contraarg.</p>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded-lg">
                    <Lightbulb className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                    <p className="text-lg font-bold">{analysis.recommendations.length}</p>
                    <p className="text-xs text-muted-foreground">Recomend.</p>
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    {analysis.caseDescription}
                  </p>
                </div>

                {analysis.legalActions.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      Acciones Legales ({analysis.legalActions.length})
                    </h4>
                    <div className="space-y-2">
                      {analysis.legalActions.map((action: any, idx: number) => (
                        <div key={idx} className="p-3 bg-blue-50/50 rounded-lg">
                          <p className="font-medium text-sm mb-1">{action.action || action.name || action}</p>
                          {action.description && (
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.legalArguments.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Scale className="h-4 w-4 text-green-600" />
                      Argumentos Legales ({analysis.legalArguments.length})
                    </h4>
                    <div className="space-y-2">
                      {analysis.legalArguments.map((arg: any, idx: number) => (
                        <div key={idx} className="p-3 bg-green-50/50 rounded-lg">
                          <p className="font-medium text-sm mb-1">{arg.argument || arg.name || arg}</p>
                          {arg.description && (
                            <p className="text-xs text-muted-foreground">{arg.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.counterarguments.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-orange-600" />
                      Contraargumentos ({analysis.counterarguments.length})
                    </h4>
                    <div className="space-y-2">
                      {analysis.counterarguments.map((counter: any, idx: number) => (
                        <div key={idx} className="p-3 bg-orange-50/50 rounded-lg">
                          <p className="font-medium text-sm mb-1">{counter.counterargument || counter.name || counter}</p>
                          {counter.description && (
                            <p className="text-xs text-muted-foreground">{counter.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.precedents && analysis.precedents.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      Precedentes ({analysis.precedents.length})
                    </h4>
                    <div className="space-y-2">
                      {analysis.precedents.map((precedent: any, idx: number) => (
                        <div key={idx} className="p-3 bg-purple-50/50 rounded-lg">
                          <p className="font-medium text-sm mb-1">{precedent.case || precedent.name || precedent}</p>
                          {precedent.description && (
                            <p className="text-xs text-muted-foreground">{precedent.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.recommendations.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-purple-600" />
                      Recomendaciones ({analysis.recommendations.length})
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
  );
}
