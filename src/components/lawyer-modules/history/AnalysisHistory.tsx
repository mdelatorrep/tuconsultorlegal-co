import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, AlertTriangle, CheckCircle, FileText } from "lucide-react";

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
        <Card key={index}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
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
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {item.risks.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  Riesgos Identificados ({item.risks.length})
                </h4>
                <div className="space-y-2">
                  {item.risks.slice(0, 3).map((risk, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg">
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
                  {item.risks.length > 3 && (
                    <p className="text-sm text-muted-foreground">
                      +{item.risks.length - 3} riesgos más
                    </p>
                  )}
                </div>
              </div>
            )}

            {item.clauses.length > 0 ? (
              <div>
                <h4 className="font-semibold mb-2">
                  Cláusulas Analizadas: {item.clauses.length}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {item.clauses.slice(0, 5).map((clause, idx) => (
                    <Badge key={idx} variant="secondary">
                      {clause.name}
                    </Badge>
                  ))}
                  {item.clauses.length > 5 && (
                    <Badge variant="outline">
                      +{item.clauses.length - 5} más
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No se encontraron cláusulas en este documento
              </div>
            )}

            {item.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Recomendaciones ({item.recommendations.length})
                </h4>
                <ul className="space-y-1">
                  {item.recommendations.slice(0, 3).map((rec, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                  {item.recommendations.length > 3 && (
                    <p className="text-sm text-muted-foreground pl-4">
                      +{item.recommendations.length - 3} recomendaciones más
                    </p>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
