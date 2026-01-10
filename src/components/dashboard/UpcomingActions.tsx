import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, CheckSquare, AlertTriangle, ChevronRight, Loader2, Calendar, Users } from "lucide-react";
import { format, isToday, isTomorrow, isPast, addDays } from "date-fns";
import { es } from "date-fns/locale";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  type: string;
  case_title?: string;
  client_name?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  event_type: string;
  is_completed: boolean;
  location: string | null;
  all_day: boolean;
}

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  status: string;
  client_name?: string;
  duration_minutes: number | null;
}

interface UnifiedAction {
  id: string;
  title: string;
  description: string | null;
  date: string;
  type: 'task' | 'event' | 'appointment';
  subtype: string;
  priority?: string;
  status?: string;
  extra?: string;
  isCompleted?: boolean;
}

interface UpcomingActionsProps {
  lawyerId: string;
  onViewCalendar: () => void;
  onViewCRM: () => void;
}

export function UpcomingActions({ lawyerId, onViewCalendar, onViewCRM }: UpcomingActionsProps) {
  const [actions, setActions] = useState<UnifiedAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'tasks' | 'events'>('all');

  useEffect(() => {
    if (lawyerId) {
      fetchAllActions();
    } else {
      setIsLoading(false);
    }
  }, [lawyerId]);

  const fetchAllActions = async () => {
    if (!lawyerId) {
      setIsLoading(false);
      return;
    }
    
    try {
      const nextWeek = addDays(new Date(), 14); // Extended to 2 weeks
      const today = new Date().toISOString();
      
      // Fetch tasks, calendar events, and appointments in parallel
      const [tasksResult, eventsResult, appointmentsResult] = await Promise.all([
        // CRM Tasks
        supabase
          .from('crm_tasks')
          .select(`
            id, title, description, due_date, priority, status, type,
            crm_cases(title),
            crm_clients(name)
          `)
          .eq('lawyer_id', lawyerId)
          .neq('status', 'completed')
          .lte('due_date', nextWeek.toISOString())
          .order('due_date', { ascending: true })
          .limit(20),
        
        // Calendar Events
        supabase
          .from('legal_calendar_events')
          .select('id, title, description, start_date, end_date, event_type, is_completed, location, all_day')
          .eq('lawyer_id', lawyerId)
          .eq('is_completed', false)
          .gte('start_date', today)
          .lte('start_date', nextWeek.toISOString())
          .order('start_date', { ascending: true })
          .limit(20),
        
        // Client Appointments
        supabase
          .from('client_appointments')
          .select(`
            id, title, description, scheduled_at, status, duration_minutes,
            crm_clients(name)
          `)
          .eq('lawyer_id', lawyerId)
          .neq('status', 'cancelled')
          .neq('status', 'completed')
          .gte('scheduled_at', today)
          .lte('scheduled_at', nextWeek.toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(10)
      ]);

      const unified: UnifiedAction[] = [];

      // Process tasks
      if (tasksResult.data) {
        tasksResult.data.forEach(t => {
          unified.push({
            id: t.id,
            title: t.title,
            description: t.description,
            date: t.due_date || '',
            type: 'task',
            subtype: t.type,
            priority: t.priority,
            status: t.status,
            extra: (t.crm_cases as any)?.title || (t.crm_clients as any)?.name,
            isCompleted: t.status === 'completed'
          });
        });
      }

      // Process calendar events
      if (eventsResult.data) {
        eventsResult.data.forEach(e => {
          unified.push({
            id: e.id,
            title: e.title,
            description: e.description,
            date: e.start_date,
            type: 'event',
            subtype: e.event_type,
            extra: e.location || undefined,
            isCompleted: e.is_completed
          });
        });
      }

      // Process appointments
      if (appointmentsResult.data) {
        appointmentsResult.data.forEach(a => {
          unified.push({
            id: a.id,
            title: a.title,
            description: a.description,
            date: a.scheduled_at,
            type: 'appointment',
            subtype: 'meeting',
            status: a.status,
            extra: (a.crm_clients as any)?.name,
            isCompleted: a.status === 'completed'
          });
        });
      }

      // Sort all by date
      unified.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setActions(unified);
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDueDateLabel = (dateStr: string) => {
    if (!dateStr) return null;
    
    const date = new Date(dateStr);
    
    if (isPast(date) && !isToday(date)) {
      return { label: 'Vencida', variant: 'destructive' as const };
    }
    if (isToday(date)) {
      return { label: 'Hoy', variant: 'destructive' as const };
    }
    if (isTomorrow(date)) {
      return { label: 'Mañana', variant: 'secondary' as const };
    }
    
    return { 
      label: format(date, "d MMM", { locale: es }), 
      variant: 'outline' as const 
    };
  };

  const getTimeLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "HH:mm", { locale: es });
  };

  const getPriorityIcon = (priority?: string) => {
    if (priority === 'high' || priority === 'urgent') {
      return <AlertTriangle className="h-3 w-3 text-destructive" />;
    }
    return null;
  };

  const getTypeIcon = (type: 'task' | 'event' | 'appointment') => {
    switch (type) {
      case 'event': return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'appointment': return <Users className="h-4 w-4 text-purple-500" />;
      default: return <CheckSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: 'task' | 'event' | 'appointment', subtype: string) => {
    if (type === 'event') {
      switch (subtype) {
        case 'hearing': return '🏛️ Audiencia';
        case 'deadline': return '⏰ Vencimiento';
        case 'meeting': return '👥 Reunión';
        case 'reminder': return '🔔 Recordatorio';
        default: return '📅 Evento';
      }
    }
    if (type === 'appointment') {
      return '👤 Cita con cliente';
    }
    switch (subtype) {
      case 'hearing': return '🏛️ Audiencia';
      case 'deadline': return '⏰ Vencimiento';
      case 'meeting': return '👥 Reunión';
      case 'followup': return '📞 Seguimiento';
      case 'document': return '📄 Documento';
      case 'review': return '🔍 Revisión';
      default: return '📋 Tarea';
    }
  };

  const filteredActions = actions.filter(action => {
    if (activeTab === 'all') return true;
    if (activeTab === 'tasks') return action.type === 'task';
    if (activeTab === 'events') return action.type === 'event' || action.type === 'appointment';
    return true;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const overdueCount = actions.filter(a => a.date && isPast(new Date(a.date)) && !isToday(new Date(a.date))).length;
  const todayCount = actions.filter(a => a.date && isToday(new Date(a.date))).length;
  const eventsCount = actions.filter(a => a.type === 'event' || a.type === 'appointment').length;
  const tasksCount = actions.filter(a => a.type === 'task').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Próximas Acciones</CardTitle>
            {(overdueCount > 0 || todayCount > 0) && (
              <Badge variant="destructive" className="text-xs">
                {overdueCount > 0 ? `${overdueCount} vencidas` : `${todayCount} hoy`}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onViewCalendar}>
            Ver calendario
          </Button>
        </div>
        <CardDescription>
          Tareas, eventos y citas próximas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Tabs for filtering */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid grid-cols-3 h-8">
            <TabsTrigger value="all" className="text-xs">
              Todos ({actions.length})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs">
              Tareas ({tasksCount})
            </TabsTrigger>
            <TabsTrigger value="events" className="text-xs">
              Eventos ({eventsCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Actions List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredActions.length > 0 ? (
            <>
              {filteredActions.slice(0, 10).map((action) => {
                const dueInfo = getDueDateLabel(action.date);
                const priorityIcon = getPriorityIcon(action.priority);
                const typeIcon = getTypeIcon(action.type);
                
                return (
                  <div
                    key={`${action.type}-${action.id}`}
                    className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={action.type === 'event' ? onViewCalendar : onViewCRM}
                  >
                    <div className="mt-0.5 shrink-0">
                      {typeIcon}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{action.title}</p>
                        {priorityIcon}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span>{getTypeLabel(action.type, action.subtype)}</span>
                        {action.date && (
                          <>
                            <span>•</span>
                            <span>{getTimeLabel(action.date)}</span>
                          </>
                        )}
                        {action.extra && (
                          <>
                            <span>•</span>
                            <span className="truncate">{action.extra}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {dueInfo && (
                      <Badge variant={dueInfo.variant} className="text-xs shrink-0">
                        {dueInfo.label}
                      </Badge>
                    )}
                  </div>
                );
              })}
              
              {filteredActions.length > 10 && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  +{filteredActions.length - 10} acciones más
                </p>
              )}
              
              <Button variant="outline" className="w-full mt-2" onClick={onViewCalendar}>
                Ver calendario completo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tienes acciones pendientes</p>
              <p className="text-xs">¡Excelente trabajo!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}