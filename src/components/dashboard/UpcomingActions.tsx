import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, CheckSquare, AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
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

interface UpcomingActionsProps {
  lawyerId: string;
  onViewCalendar: () => void;
  onViewCRM: () => void;
}

export function UpcomingActions({ lawyerId, onViewCalendar, onViewCRM }: UpcomingActionsProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingTasks();
  }, [lawyerId]);

  const fetchUpcomingTasks = async () => {
    try {
      // Fetch tasks for the next 7 days
      const nextWeek = addDays(new Date(), 7);
      
      const { data, error } = await supabase
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
        .limit(6);

      if (error) throw error;

      const formattedTasks = data?.map(t => ({
        ...t,
        case_title: (t.crm_cases as any)?.title,
        client_name: (t.crm_clients as any)?.name
      })) || [];

      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDueDateLabel = (dueDate: string | null) => {
    if (!dueDate) return null;
    
    const date = new Date(dueDate);
    
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

  const getPriorityIcon = (priority: string) => {
    if (priority === 'high' || priority === 'urgent') {
      return <AlertTriangle className="h-3 w-3 text-destructive" />;
    }
    return null;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'hearing': return '🏛️ Audiencia';
      case 'deadline': return '⏰ Vencimiento';
      case 'meeting': return '👥 Reunión';
      case 'followup': return '📞 Seguimiento';
      case 'document': return '📄 Documento';
      case 'review': return '🔍 Revisión';
      default: return '📋 Tarea';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const overdueCount = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))).length;
  const todayCount = tasks.filter(t => t.due_date && isToday(new Date(t.due_date))).length;

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
          Tareas y eventos próximos de tus casos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length > 0 ? (
          <>
            {tasks.map((task) => {
              const dueInfo = getDueDateLabel(task.due_date);
              const priorityIcon = getPriorityIcon(task.priority);
              
              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={onViewCRM}
                >
                  <CheckSquare className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      {priorityIcon}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>{getTypeLabel(task.type)}</span>
                      {task.case_title && (
                        <>
                          <span>•</span>
                          <span className="truncate">{task.case_title}</span>
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
            
            <Button variant="outline" className="w-full mt-2" onClick={onViewCRM}>
              Ver todas las tareas
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tienes tareas pendientes</p>
            <p className="text-xs">¡Excelente trabajo!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}