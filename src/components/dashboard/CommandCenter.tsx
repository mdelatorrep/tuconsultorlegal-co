import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Users,
  Briefcase,
  Target,
  Zap,
  ArrowRight,
  Phone,
  Mail,
  Calendar,
  Loader2
} from "lucide-react";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import logoIcon from "@/assets/favicon.png";

interface CommandCenterProps {
  userName: string;
  lawyerId: string;
  onViewCredits: () => void;
  onNavigateToCRM: (tab: string) => void;
}

interface DailyMetrics {
  pipelineValue: number;
  leadsNew: number;
  clientsAtRisk: number;
  tasksOverdue: number;
  winRate: number;
  monthlyGoal: number;
  monthlyRevenue: number;
}

interface CriticalAction {
  id: string;
  type: 'task' | 'lead' | 'case' | 'client';
  title: string;
  subtitle: string;
  urgency: 'high' | 'medium' | 'low';
  icon: typeof Phone;
  action: () => void;
}

interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  message: string;
  actionLabel?: string;
  action?: () => void;
}

export function CommandCenter({ userName, lawyerId, onViewCredits, onNavigateToCRM }: CommandCenterProps) {
  const [metrics, setMetrics] = useState<DailyMetrics>({
    pipelineValue: 0,
    leadsNew: 0,
    clientsAtRisk: 0,
    tasksOverdue: 0,
    winRate: 0,
    monthlyGoal: 50000000, // Default 50M COP
    monthlyRevenue: 0
  });
  const [criticalActions, setCriticalActions] = useState<CriticalAction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [lawyerId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [
        casesResult,
        leadsResult,
        clientsResult,
        tasksResult
      ] = await Promise.all([
        supabase.from('crm_cases').select('*').eq('lawyer_id', lawyerId),
        supabase.from('crm_leads').select('*').eq('lawyer_id', lawyerId),
        supabase.from('crm_clients').select('*').eq('lawyer_id', lawyerId),
        supabase.from('crm_tasks').select('*').eq('lawyer_id', lawyerId).eq('status', 'pending')
      ]);

      const cases = casesResult.data || [];
      const leads = leadsResult.data || [];
      const clients = clientsResult.data || [];
      const tasks = tasksResult.data || [];

      // Calculate pipeline value
      const pipelineValue = cases
        .filter(c => c.status === 'active')
        .reduce((sum, c) => sum + (Number(c.expected_value) || 0), 0);

      // New leads (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const leadsNew = leads.filter(l => 
        l.status === 'new' && new Date(l.created_at) >= sevenDaysAgo
      ).length;

      // Clients at risk (health_score < 50 or no contact in 30+ days)
      const clientsAtRisk = clients.filter(c => {
        const healthScore = c.health_score || 100;
        const lastContact = c.last_contact_date ? new Date(c.last_contact_date) : null;
        const daysSinceContact = lastContact ? differenceInDays(new Date(), lastContact) : 999;
        return healthScore < 50 || daysSinceContact > 30;
      }).length;

      // Overdue tasks
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tasksOverdue = tasks.filter(t => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < today;
      }).length;

      // Win rate (converted leads / total closed leads)
      const closedLeads = leads.filter(l => ['converted', 'lost'].includes(l.status || ''));
      const convertedLeads = leads.filter(l => l.status === 'converted');
      const winRate = closedLeads.length > 0 
        ? Math.round((convertedLeads.length / closedLeads.length) * 100) 
        : 0;

      setMetrics({
        pipelineValue,
        leadsNew,
        clientsAtRisk,
        tasksOverdue,
        winRate,
        monthlyGoal: 50000000,
        monthlyRevenue: pipelineValue * 0.3 // Estimate 30% of pipeline as current month revenue
      });

      // Build critical actions (max 3)
      const actions: CriticalAction[] = [];

      // Priority 1: Overdue tasks
      const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < today);
      if (overdueTasks.length > 0) {
        actions.push({
          id: 'overdue-tasks',
          type: 'task',
          title: `${overdueTasks.length} tarea${overdueTasks.length > 1 ? 's' : ''} vencida${overdueTasks.length > 1 ? 's' : ''}`,
          subtitle: 'Requiere atención inmediata',
          urgency: 'high',
          icon: Clock,
          action: () => onNavigateToCRM('tasks')
        });
      }

      // Priority 2: New hot leads
      const hotLeads = leads.filter(l => l.status === 'new' && (l.score || 0) >= 50);
      if (hotLeads.length > 0) {
        actions.push({
          id: 'hot-leads',
          type: 'lead',
          title: `${hotLeads.length} lead${hotLeads.length > 1 ? 's' : ''} caliente${hotLeads.length > 1 ? 's' : ''}`,
          subtitle: 'Alta probabilidad de conversión',
          urgency: 'medium',
          icon: Phone,
          action: () => onNavigateToCRM('leads')
        });
      }

      // Priority 3: At-risk clients
      if (clientsAtRisk > 0) {
        actions.push({
          id: 'at-risk-clients',
          type: 'client',
          title: `${clientsAtRisk} cliente${clientsAtRisk > 1 ? 's' : ''} en riesgo`,
          subtitle: 'Sin contacto reciente',
          urgency: 'medium',
          icon: Users,
          action: () => onNavigateToCRM('clients')
        });
      }

      // Fill with cases if needed
      const casesNeedingAction = cases.filter(c => 
        c.next_action_date && isToday(new Date(c.next_action_date))
      );
      if (actions.length < 3 && casesNeedingAction.length > 0) {
        actions.push({
          id: 'cases-today',
          type: 'case',
          title: `${casesNeedingAction.length} caso${casesNeedingAction.length > 1 ? 's' : ''} requiere${casesNeedingAction.length > 1 ? 'n' : ''} acción`,
          subtitle: 'Fecha de seguimiento: hoy',
          urgency: 'low',
          icon: Briefcase,
          action: () => onNavigateToCRM('cases')
        });
      }

      setCriticalActions(actions.slice(0, 3));

      // Build alerts
      const alertsList: Alert[] = [];

      if (tasksOverdue > 5) {
        alertsList.push({
          id: 'many-overdue',
          type: 'danger',
          message: `Tienes ${tasksOverdue} tareas vencidas. Tu productividad está en riesgo.`,
          actionLabel: 'Ver tareas',
          action: () => onNavigateToCRM('tasks')
        });
      }

      if (leadsNew >= 3) {
        alertsList.push({
          id: 'new-leads',
          type: 'info',
          message: `¡${leadsNew} nuevos leads esta semana! Contacta rápido para mejor conversión.`,
          actionLabel: 'Ver leads',
          action: () => onNavigateToCRM('leads')
        });
      }

      if (clientsAtRisk >= 3) {
        alertsList.push({
          id: 'clients-risk',
          type: 'warning',
          message: `${clientsAtRisk} clientes sin contacto en 30+ días. Agenda seguimiento.`,
          actionLabel: 'Ver clientes',
          action: () => onNavigateToCRM('clients')
        });
      }

      setAlerts(alertsList);

    } catch (error) {
      console.error('Error fetching command center data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const progressPercentage = Math.min(
    Math.round((metrics.monthlyRevenue / metrics.monthlyGoal) * 100),
    100
  );

  if (loading) {
    return (
      <Card className="h-full bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Welcome + Progress Bar */}
      <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-primary/20 overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Welcome */}
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                <Target className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  ¡Buen día, {userName}!
                </h1>
                <p className="text-muted-foreground text-sm">
                  Centro de Comando • {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
                </p>
              </div>
            </div>

            {/* Monthly Goal Progress */}
            <div className="flex-1 max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Meta mensual</span>
                <span className="text-sm font-bold text-primary">
                  {formatCurrency(metrics.monthlyRevenue)} / {formatCurrency(metrics.monthlyGoal)}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {progressPercentage}% completado
              </p>
            </div>

            {/* Praxis Hub Badge */}
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-2">
                <img src={logoIcon} alt="Praxis Hub" className="h-4 w-4" />
                Praxis Hub
              </Badge>
              <Button 
                variant="default" 
                size="sm"
                onClick={onViewCredits}
                className="bg-primary hover:bg-primary/90"
              >
                Mis Créditos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-primary/10 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => onNavigateToCRM('cases')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-primary">{formatCurrency(metrics.pipelineValue)}</p>
                <p className="text-xs text-muted-foreground">Pipeline</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => onNavigateToCRM('leads')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-primary">{metrics.leadsNew}</p>
                <p className="text-xs text-muted-foreground">Leads nuevos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => onNavigateToCRM('analytics')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-primary">{metrics.winRate}%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-primary/10 hover:border-primary/30 transition-colors cursor-pointer ${metrics.clientsAtRisk > 0 ? 'border-amber-300' : ''}`} onClick={() => onNavigateToCRM('clients')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${metrics.clientsAtRisk > 0 ? 'bg-amber-100' : 'bg-muted'}`}>
                <AlertTriangle className={`h-5 w-5 ${metrics.clientsAtRisk > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className={`text-lg font-bold ${metrics.clientsAtRisk > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {metrics.clientsAtRisk}
                </p>
                <p className="text-xs text-muted-foreground">En riesgo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-primary/10 hover:border-primary/30 transition-colors cursor-pointer ${metrics.tasksOverdue > 0 ? 'border-red-300' : ''}`} onClick={() => onNavigateToCRM('tasks')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${metrics.tasksOverdue > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                {metrics.tasksOverdue > 0 ? (
                  <Clock className="h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>
              <div>
                <p className={`text-lg font-bold ${metrics.tasksOverdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.tasksOverdue}
                </p>
                <p className="text-xs text-muted-foreground">Vencidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Actions + Alerts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Critical Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Acciones Críticas Hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalActions.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                <p className="text-muted-foreground">¡Todo al día! Sin acciones urgentes.</p>
              </div>
            ) : (
              criticalActions.map((action) => (
                <div
                  key={action.id}
                  onClick={action.action}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    action.urgency === 'high' 
                      ? 'border-red-200 bg-red-50 hover:border-red-300' 
                      : action.urgency === 'medium'
                      ? 'border-orange-200 bg-orange-50 hover:border-orange-300'
                      : 'border-primary/20 bg-primary/5 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        action.urgency === 'high' 
                          ? 'bg-red-100' 
                          : action.urgency === 'medium'
                          ? 'bg-orange-100'
                          : 'bg-primary/10'
                      }`}>
                        <action.icon className={`h-4 w-4 ${
                          action.urgency === 'high' 
                            ? 'text-red-600' 
                            : action.urgency === 'medium'
                            ? 'text-orange-600'
                            : 'text-primary'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.subtitle}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Smart Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alertas Inteligentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                <p className="text-muted-foreground">Sin alertas activas.</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${
                    alert.type === 'danger' 
                      ? 'border-red-200 bg-red-50' 
                      : alert.type === 'warning'
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <p className="text-sm mb-2">{alert.message}</p>
                  {alert.actionLabel && alert.action && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={alert.action}
                      className="h-7 text-xs"
                    >
                      {alert.actionLabel}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
