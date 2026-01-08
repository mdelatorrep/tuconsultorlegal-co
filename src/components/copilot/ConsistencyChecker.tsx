import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ConsistencyIssue {
  id: string;
  type: 'contradiction' | 'undefined_term' | 'missing_reference' | 'ambiguity';
  severity: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  affectedText?: string;
  suggestion?: string;
  location?: { start: number; end: number };
}

interface ConsistencyCheckerProps {
  documentContent: string;
  documentType: string;
  lawyerId: string;
  onHighlightText?: (start: number, end: number) => void;
  onApplyFix?: (issue: ConsistencyIssue) => void;
}

export function ConsistencyChecker({
  documentContent,
  documentType,
  lawyerId,
  onHighlightText,
  onApplyFix
}: ConsistencyCheckerProps) {
  const [issues, setIssues] = useState<ConsistencyIssue[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const checkConsistency = async () => {
    if (documentContent.length < 100) {
      toast.info('El documento es muy corto para verificar consistencia');
      return;
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: {
          action: 'check_consistency',
          text: documentContent,
          documentType,
          lawyerId
        }
      });

      if (error) throw error;

      setIssues(data.issues || []);
      setLastChecked(new Date());
      
      if (data.issues?.length === 0) {
        toast.success('No se detectaron inconsistencias');
      } else {
        toast.info(`Se encontraron ${data.issues.length} posibles inconsistencias`);
      }
    } catch (error) {
      console.error('Consistency check error:', error);
      toast.error('Error al verificar consistencia');
    } finally {
      setIsChecking(false);
    }
  };

  const toggleIssue = (id: string) => {
    setExpandedIssues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      error: 'bg-destructive/10 text-destructive border-destructive/20',
      warning: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      info: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    };
    
    return (
      <Badge variant="outline" className={cn('text-xs', colors[severity])}>
        {severity === 'error' ? 'Crítico' : severity === 'warning' ? 'Advertencia' : 'Info'}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      contradiction: 'Contradicción',
      undefined_term: 'Término sin definir',
      missing_reference: 'Referencia faltante',
      ambiguity: 'Ambigüedad'
    };
    return labels[type] || type;
  };

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Verificación de Consistencia</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkConsistency}
          disabled={isChecking}
        >
          {isChecking ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          Verificar
        </Button>
      </div>

      {/* Summary */}
      {lastChecked && (
        <div className="flex items-center gap-3 mb-4 p-2 bg-muted/50 rounded-lg">
          {errorCount > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-destructive">{errorCount}</span>
            </div>
          )}
          {warningCount > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="font-medium text-yellow-600">{warningCount}</span>
            </div>
          )}
          {infoCount > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-blue-600">{infoCount}</span>
            </div>
          )}
          {issues.length === 0 && (
            <div className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Sin problemas detectados</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            Última verificación: {lastChecked.toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Issues List */}
      <ScrollArea className="max-h-[300px]">
        <div className="space-y-2">
          {issues.map((issue) => (
            <Collapsible
              key={issue.id}
              open={expandedIssues.has(issue.id)}
              onOpenChange={() => toggleIssue(issue.id)}
            >
              <CollapsibleTrigger className="w-full">
                <div className={cn(
                  "flex items-center gap-2 p-2 rounded-lg text-left w-full",
                  "hover:bg-muted/50 transition-colors",
                  issue.severity === 'error' && "bg-destructive/5",
                  issue.severity === 'warning' && "bg-yellow-500/5"
                )}>
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{issue.title}</p>
                    <p className="text-xs text-muted-foreground">{getTypeLabel(issue.type)}</p>
                  </div>
                  {getSeverityBadge(issue.severity)}
                  {expandedIssues.has(issue.id) ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="pl-8 pr-2 pb-2 space-y-2">
                  <p className="text-sm text-muted-foreground">{issue.description}</p>
                  
                  {issue.affectedText && (
                    <div className="p-2 bg-muted/30 rounded text-xs font-mono">
                      "{issue.affectedText}"
                    </div>
                  )}
                  
                  {issue.suggestion && (
                    <div className="p-2 bg-primary/5 border border-primary/10 rounded">
                      <p className="text-xs font-medium text-primary mb-1">Sugerencia:</p>
                      <p className="text-sm">{issue.suggestion}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-1">
                    {issue.location && onHighlightText && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => onHighlightText(issue.location!.start, issue.location!.end)}
                      >
                        Ver en documento
                      </Button>
                    )}
                    {issue.suggestion && onApplyFix && (
                      <Button
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => onApplyFix(issue)}
                      >
                        Aplicar corrección
                      </Button>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>

      {!lastChecked && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Haz clic en "Verificar" para analizar el documento
        </p>
      )}
    </Card>
  );
}
