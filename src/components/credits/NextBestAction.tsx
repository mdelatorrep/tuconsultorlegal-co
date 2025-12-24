import { AlertTriangle, Clock, FileText, Users, Target, ChevronRight, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  token: string;
  document_type: string;
  status: string;
  sla_status?: string;
  sla_deadline?: string;
  user_name?: string;
  created_at: string;
}

interface NextBestActionProps {
  overdueDocuments: Document[];
  atRiskDocuments: Document[];
  pendingDocuments: Document[];
  newLeadsCount: number;
  incompleteMissions: number;
  onViewDocument: (doc: Document) => void;
  onViewCRM: () => void;
  onViewMissions: () => void;
}

export function NextBestAction({
  overdueDocuments,
  atRiskDocuments,
  pendingDocuments,
  newLeadsCount,
  incompleteMissions,
  onViewDocument,
  onViewCRM,
  onViewMissions
}: NextBestActionProps) {
  // Priority hierarchy
  const actions = [
    ...(overdueDocuments.length > 0 ? [{
      priority: 1,
      type: 'overdue',
      icon: AlertTriangle,
      title: `${overdueDocuments.length} documento${overdueDocuments.length > 1 ? 's' : ''} vencido${overdueDocuments.length > 1 ? 's' : ''}`,
      description: 'Requieren atención inmediata - SLA incumplido',
      action: () => onViewDocument(overdueDocuments[0]),
      color: 'destructive',
      bgClass: 'bg-destructive/10 border-destructive/30',
      iconClass: 'text-destructive'
    }] : []),
    ...(atRiskDocuments.length > 0 ? [{
      priority: 2,
      type: 'at_risk',
      icon: Clock,
      title: `${atRiskDocuments.length} documento${atRiskDocuments.length > 1 ? 's' : ''} en riesgo`,
      description: 'Próximos a vencer - Actúa ahora',
      action: () => onViewDocument(atRiskDocuments[0]),
      color: 'warning',
      bgClass: 'bg-amber-500/10 border-amber-500/30',
      iconClass: 'text-amber-500'
    }] : []),
    ...(newLeadsCount > 0 ? [{
      priority: 3,
      type: 'leads',
      icon: Users,
      title: `${newLeadsCount} nuevo${newLeadsCount > 1 ? 's' : ''} lead${newLeadsCount > 1 ? 's' : ''}`,
      description: 'Clientes potenciales esperando respuesta',
      action: onViewCRM,
      color: 'primary',
      bgClass: 'bg-primary/10 border-primary/30',
      iconClass: 'text-primary'
    }] : []),
    ...(incompleteMissions > 0 ? [{
      priority: 4,
      type: 'missions',
      icon: Target,
      title: `${incompleteMissions} misión${incompleteMissions > 1 ? 'es' : ''} disponible${incompleteMissions > 1 ? 's' : ''}`,
      description: '¡Gana créditos completando misiones!',
      action: onViewMissions,
      color: 'secondary',
      bgClass: 'bg-emerald-500/10 border-emerald-500/30',
      iconClass: 'text-emerald-500'
    }] : []),
    ...(pendingDocuments.length > 0 ? [{
      priority: 5,
      type: 'pending',
      icon: FileText,
      title: `${pendingDocuments.length} documento${pendingDocuments.length > 1 ? 's' : ''} pendiente${pendingDocuments.length > 1 ? 's' : ''}`,
      description: 'Documentos en cola de revisión',
      action: () => onViewDocument(pendingDocuments[0]),
      color: 'muted',
      bgClass: 'bg-muted/50 border-border',
      iconClass: 'text-muted-foreground'
    }] : [])
  ];

  if (actions.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mx-auto mb-3">
            <Target className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="font-semibold text-lg mb-1">¡Todo al día!</h3>
          <p className="text-sm text-muted-foreground mb-4">
            No tienes tareas urgentes pendientes.
          </p>
          <Button onClick={onViewMissions} variant="outline" size="sm">
            <Target className="h-4 w-4 mr-2" />
            Ver misiones disponibles
          </Button>
        </CardContent>
      </Card>
    );
  }

  const primaryAction = actions[0];
  const secondaryActions = actions.slice(1, 4);

  return (
    <div className="space-y-3">
      {/* Primary Action - Most Urgent */}
      <Card 
        className={cn(
          "transition-all hover:shadow-lg border-2",
          primaryAction.bgClass
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
              primaryAction.priority === 1 ? "bg-destructive/20 animate-pulse" : "bg-background"
            )}>
              <primaryAction.icon className={cn("h-7 w-7", primaryAction.iconClass)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={primaryAction.priority === 1 ? "destructive" : "secondary"} className="text-xs">
                  ACCIÓN PRIORITARIA
                </Badge>
              </div>
              <h3 className="font-semibold text-lg">{primaryAction.title}</h3>
              <p className="text-sm text-muted-foreground">{primaryAction.description}</p>
            </div>
            <Button 
              onClick={primaryAction.action}
              variant={primaryAction.priority === 1 ? "destructive" : "default"}
              size="sm"
              className="shrink-0"
            >
              {primaryAction.priority === 1 ? 'Revisar ahora' : 
               primaryAction.type === 'leads' ? 'Ver leads' :
               primaryAction.type === 'missions' ? 'Ver misiones' : 'Ver'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Actions */}
      {secondaryActions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {secondaryActions.map((action) => (
            <Card 
              key={action.type}
              className={cn(
                "transition-all hover:shadow-md",
                action.bgClass
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <action.icon className={cn("h-5 w-5 shrink-0", action.iconClass)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{action.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={action.action}
                    className="shrink-0 h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
