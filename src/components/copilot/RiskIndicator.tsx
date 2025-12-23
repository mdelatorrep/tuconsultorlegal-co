import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Info, Shield } from 'lucide-react';

interface Risk {
  id: string;
  level: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestion?: string;
}

interface RiskIndicatorProps {
  risks: Risk[];
}

export function RiskIndicator({ risks }: RiskIndicatorProps) {
  const highRisks = risks.filter(r => r.level === 'high');
  const mediumRisks = risks.filter(r => r.level === 'medium');
  const lowRisks = risks.filter(r => r.level === 'low');

  const overallLevel = highRisks.length > 0 ? 'high' : mediumRisks.length > 0 ? 'medium' : 'low';

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  const getOverallColor = () => {
    switch (overallLevel) {
      case 'high': return 'border-red-500 bg-red-500/5';
      case 'medium': return 'border-yellow-500 bg-yellow-500/5';
      default: return 'border-green-500 bg-green-500/5';
    }
  };

  if (risks.length === 0) {
    return (
      <Card className="p-4 border-green-500 bg-green-500/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-green-500/10">
            <Shield className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-medium text-green-700">Sin riesgos detectados</h3>
            <p className="text-sm text-muted-foreground">El documento parece estar en orden</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${getOverallColor()}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium flex items-center gap-2">
          {getLevelIcon(overallLevel)}
          Análisis de Riesgos
        </h3>
        <div className="flex items-center gap-1">
          {highRisks.length > 0 && (
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
              {highRisks.length} Alto
            </Badge>
          )}
          {mediumRisks.length > 0 && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              {mediumRisks.length} Medio
            </Badge>
          )}
          {lowRisks.length > 0 && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              {lowRisks.length} Bajo
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-[250px] overflow-y-auto">
        {risks.map(risk => (
          <div
            key={risk.id}
            className={`p-3 rounded-lg border ${getLevelColor(risk.level)}`}
          >
            <div className="flex items-start gap-2">
              {getLevelIcon(risk.level)}
              <div className="flex-1">
                <p className="font-medium text-sm">{risk.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{risk.description}</p>
                {risk.suggestion && (
                  <p className="text-xs mt-2 p-2 bg-background/50 rounded">
                    💡 {risk.suggestion}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
