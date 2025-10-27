import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Brain, Target, Scale, Shield, Lightbulb } from "lucide-react";

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
        <Card key={index}>
          <CardHeader>
            <CardDescription className="mb-2">
              {new Date(analysis.timestamp).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </CardDescription>
            <p className="text-sm line-clamp-3">
              {analysis.caseDescription}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <Target className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                <p className="text-2xl font-bold">{analysis.legalActions.length}</p>
                <p className="text-xs text-muted-foreground">Acciones</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <Scale className="h-6 w-6 mx-auto mb-1 text-green-600" />
                <p className="text-2xl font-bold">{analysis.legalArguments.length}</p>
                <p className="text-xs text-muted-foreground">Argumentos</p>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <Shield className="h-6 w-6 mx-auto mb-1 text-orange-600" />
                <p className="text-2xl font-bold">{analysis.counterarguments.length}</p>
                <p className="text-xs text-muted-foreground">Contraargumentos</p>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <Lightbulb className="h-6 w-6 mx-auto mb-1 text-purple-600" />
                <p className="text-2xl font-bold">{analysis.recommendations.length}</p>
                <p className="text-xs text-muted-foreground">Recomendaciones</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
