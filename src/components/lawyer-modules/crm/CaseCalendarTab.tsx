import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isBefore, isToday, isTomorrow, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  is_completed: boolean;
  is_auto_generated: boolean;
}

interface CaseCalendarTabProps {
  caseId: string;
  lawyerId: string;
  caseTitle: string;
}

const CaseCalendarTab: React.FC<CaseCalendarTabProps> = ({ caseId, lawyerId, caseTitle }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [caseId]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('legal_calendar_events')
        .select('*')
        .eq('case_id', caseId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Error al cargar eventos');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEventComplete = async (eventId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('legal_calendar_events')
        .update({ 
          is_completed: !isCompleted,
          completed_at: !isCompleted ? new Date().toISOString() : null
        })
        .eq('id', eventId);

      if (error) throw error;
      
      setEvents(prev => prev.map(e => 
        e.id === eventId 
          ? { ...e, is_completed: !isCompleted }
          : e
      ));
      
      toast.success(!isCompleted ? 'Evento completado' : 'Evento marcado como pendiente');
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Error al actualizar evento');
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'hearing': return '⚖️';
      case 'deadline': return '⏰';
      case 'meeting': return '👥';
      case 'reminder': return '🔔';
      default: return '📅';
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'hearing': return 'Audiencia';
      case 'deadline': return 'Plazo';
      case 'meeting': return 'Reunión';
      case 'reminder': return 'Recordatorio';
      default: return 'Evento';
    }
  };

  const getDateBadge = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    
    if (isBefore(date, now) && !isToday(date)) {
      return <Badge variant="destructive" className="text-xs">Vencido</Badge>;
    }
    if (isToday(date)) {
      return <Badge className="bg-amber-500 text-xs">Hoy</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge className="bg-blue-500 text-xs">Mañana</Badge>;
    }
    if (isBefore(date, addDays(now, 7))) {
      return <Badge variant="outline" className="text-xs">Esta semana</Badge>;
    }
    return null;
  };

  const upcomingEvents = events.filter(e => !e.is_completed && !isBefore(new Date(e.start_date), new Date()));
  const pastEvents = events.filter(e => e.is_completed || isBefore(new Date(e.start_date), new Date()));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-2">No hay eventos en el calendario de este caso</p>
          <p className="text-sm text-muted-foreground">
            Usa la acción rápida "Agregar Evento" para programar audiencias, plazos y reuniones
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Eventos Próximos
          </CardTitle>
          <CardDescription>
            {upcomingEvents.length} evento(s) pendiente(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay eventos próximos
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div 
                    key={event.id} 
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={event.is_completed}
                      onCheckedChange={() => toggleEventComplete(event.id, event.is_completed)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{getEventTypeIcon(event.event_type)}</span>
                        <p className="font-medium">{event.title}</p>
                        {getDateBadge(event.start_date)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(event.start_date), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getEventTypeLabel(event.event_type)}
                        </Badge>
                      </div>
                      {event.location && (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-sm mt-1">{event.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Past/Completed Events */}
      {pastEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-5 w-5" />
              Eventos Completados/Pasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {pastEvents.map((event) => (
                  <div 
                    key={event.id} 
                    className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30 opacity-70"
                  >
                    <Checkbox
                      checked={event.is_completed}
                      onCheckedChange={() => toggleEventComplete(event.id, event.is_completed)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${event.is_completed ? 'line-through' : ''}`}>
                        {getEventTypeIcon(event.event_type)} {event.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.start_date), 'dd/MM/yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CaseCalendarTab;
