import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Eye, AlertTriangle, CheckCircle, FileText, ChevronRight } from "lucide-react";

interface AnalysisResult {
  fileName: string;
  documentType: string;
  clauses: {
    name: string;
    content: string;
    riskLevel: 'low' | 'medium' | 'high';
    recommendation?: string;
  }[];
  risks: {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  recommendations: string[];
  timestamp: string;
}

interface AnalysisHistoryProps {
  history: AnalysisResult[];
}

export default function AnalysisHistory({ history }: AnalysisHistoryProps) {
  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Eye className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay análisis previos</h3>
          <p className="text-muted-foreground">
            Los análisis de documentos aparecerán aquí
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item, index) => (
        <Collapsible key={index}>
          <Card className="hover:shadow-lg transition-shadow">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-orange-50/50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-orange-600" />
                      {item.fileName}
                    </CardTitle>
                    <CardDescription>
                      {item.documentType} • {new Date(item.timestamp).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </CardDescription>
                  </div>
                  <ChevronRight className="h-5 w-5 text-orange-600 flex-shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="text-center p-2 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-red-600" />
                    <p className="text-lg font-bold">{item.risks.length}</p>
                    <p className="text-xs text-muted-foreground">Riesgos</p>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                    <p className="text-lg font-bold">{item.clauses.length}</p>
                    <p className="text-xs text-muted-foreground">Cláusulas</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-600" />
                    <p className="text-lg font-bold">{item.recommendations.length}</p>
                    <p className="text-xs text-muted-foreground">Recomend.</p>
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {item.risks.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      Riesgos Identificados ({item.risks.length})
                    </h4>
                    <div className="space-y-2">
                      {item.risks.map((risk, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                          <Badge 
                            variant={risk.severity === 'high' ? 'destructive' : 'outline'}
                            className="mt-0.5"
                          >
                            {risk.severity === 'high' ? 'Alto' : risk.severity === 'medium' ? 'Medio' : 'Bajo'}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{risk.type}</p>
                            <p className="text-xs text-muted-foreground">{risk.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {item.clauses.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">
                      Cláusulas Analizadas: {item.clauses.length}
                    </h4>
                    <div className="space-y-3">
                      {item.clauses.map((clause, idx) => (
                        <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary">{clause.name}</Badge>
                            <Badge 
                              variant={
                                clause.riskLevel === 'high' ? 'destructive' : 
                                clause.riskLevel === 'medium' ? 'secondary' : 
                                'outline'
                              }
                            >
                              {clause.riskLevel === 'high' ? 'Riesgo Alto' : 
                               clause.riskLevel === 'medium' ? 'Riesgo Medio' : 
                               'Riesgo Bajo'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{clause.content}</p>
                          {clause.recommendation && (
                            <p className="text-xs text-orange-600 mt-2">💡 {clause.recommendation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {item.recommendations.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Recomendaciones ({item.recommendations.length})
                    </h4>
                    <ul className="space-y-2">
                      {item.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
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
