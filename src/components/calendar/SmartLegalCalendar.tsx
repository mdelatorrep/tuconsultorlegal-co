import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarDays, 
  Plus, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  FileText,
  Bell,
  Calculator,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DeadlineCalculator } from './DeadlineCalculator';
import { AutoDocketing } from './AutoDocketing';
import { NewEventDialog } from './NewEventDialog';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  location: string | null;
  is_completed: boolean;
}

interface Holiday {
  fecha: string;
  nombre: string;
  tipo: string;
}

interface SmartLegalCalendarProps {
  lawyerId: string;
}

export function SmartLegalCalendar({ lawyerId }: SmartLegalCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showAutoDocket, setShowAutoDocket] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);

  useEffect(() => {
    loadEvents();
    loadHolidays();
  }, [lawyerId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('legal_calendar_events')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents((data || []) as CalendarEvent[]);
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  const loadHolidays = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('colombian_holidays')
        .select('*')
        .gte('year', currentYear)
        .lte('year', currentYear + 1);

      if (error) throw error;
      setHolidays(data || []);
    } catch (error) {
      console.error('Error loading holidays:', error);
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_date), date));
  };

  const getHolidayForDate = (date: Date) => {
    return holidays.find(h => isSameDay(new Date(h.fecha), date));
  };

  const isHoliday = (date: Date) => {
    return holidays.some(h => isSameDay(new Date(h.fecha), date));
  };

  const isBusinessDay = (date: Date) => {
    return !isWeekend(date) && !isHoliday(date);
  };

  const toggleEventComplete = async (eventId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('legal_calendar_events')
        .update({ is_completed: completed })
        .eq('id', eventId);

      if (error) throw error;
      
      setEvents(events.map(e => 
        e.id === eventId ? { ...e, is_completed: completed } : e
      ));
      
      toast.success(completed ? 'Marcado como completado' : 'Desmarcado');
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Error al actualizar');
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'audiencia': return '⚖️';
      case 'deadline': return '⏰';
      case 'filing': return '📄';
      case 'meeting': return '👥';
      default: return '📅';
    }
  };

  const upcomingDeadlines = events
    .filter(e => !e.is_completed && e.event_type === 'deadline' && new Date(e.start_date) >= new Date())
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 5);

  const selectedDateEvents = getEventsForDate(selectedDate);
  const selectedDateHoliday = getHolidayForDate(selectedDate);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendario Legal Inteligente</h2>
          <p className="text-muted-foreground">Gestión de términos y plazos según normativa colombiana</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calculator className="h-4 w-4 mr-2" />
                Calcular Términos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Calculadora de Términos Legales</DialogTitle>
              </DialogHeader>
              <DeadlineCalculator 
                lawyerId={lawyerId} 
                onEventCreated={() => {
                  loadEvents();
                  setShowCalculator(false);
                }}
              />
            </DialogContent>
          </Dialog>
          
          <Dialog open={showAutoDocket} onOpenChange={setShowAutoDocket}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Extraer Fechas
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Extracción Automática de Fechas</DialogTitle>
              </DialogHeader>
              <AutoDocketing 
                lawyerId={lawyerId}
                onEventsCreated={() => {
                  loadEvents();
                  setShowAutoDocket(false);
                }}
              />
            </DialogContent>
          </Dialog>
          
          <Dialog open={showNewEvent} onOpenChange={setShowNewEvent}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Evento</DialogTitle>
              </DialogHeader>
              <NewEventDialog 
                lawyerId={lawyerId}
                selectedDate={selectedDate}
                onEventCreated={() => {
                  loadEvents();
                  setShowNewEvent(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={es}
              className="rounded-md border w-full"
              modifiers={{
                hasEvents: (date) => getEventsForDate(date).length > 0,
                holiday: (date) => isHoliday(date),
                weekend: (date) => isWeekend(date)
              }}
              modifiersStyles={{
                hasEvents: { fontWeight: 'bold' },
                holiday: { color: 'hsl(var(--destructive))' },
                weekend: { color: 'hsl(var(--muted-foreground))' }
              }}
            />
            
            {/* Selected Date Details */}
            <div className="mt-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">
                  {format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                </h3>
                {selectedDateHoliday && (
                  <Badge variant="destructive">{selectedDateHoliday.nombre}</Badge>
                )}
                {!isBusinessDay(selectedDate) && !selectedDateHoliday && (
                  <Badge variant="outline">Día no hábil</Badge>
                )}
              </div>
              
              {selectedDateEvents.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay eventos para este día</p>
              ) : (
                <div className="space-y-2">
                    {selectedDateEvents.map(event => (
                      <div 
                        key={event.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          event.is_completed ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getEventTypeIcon(event.event_type)}</span>
                          <div>
                            <p className={`font-medium ${event.is_completed ? 'line-through' : ''}`}>
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}
                        </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {event.event_type}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                          onClick={() => toggleEventComplete(event.id, !event.is_completed)}
                        >
                          <CheckCircle2 className={`h-5 w-5 ${
                            event.is_completed ? 'text-green-500' : 'text-muted-foreground'
                          }`} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Próximos Vencimientos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : upcomingDeadlines.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No hay vencimientos próximos
                </p>
              ) : (
                <div className="space-y-3">
                    {upcomingDeadlines.map(event => (
                      <div 
                        key={event.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedDate(new Date(event.start_date))}
                      >
                        <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-600">
                        <Clock className="h-4 w-4" />
                      </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.start_date), "d 'de' MMM", { locale: es })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Resumen del Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">
                    {events.filter(e => {
                      const eventDate = new Date(e.start_date);
                      const now = new Date();
                      return eventDate.getMonth() === now.getMonth() &&
                             eventDate.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Eventos</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-500">
                    {upcomingDeadlines.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Vencimientos</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-500">
                    {events.filter(e => e.is_completed).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Completados</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-red-500">
                    {holidays.filter(h => {
                      const hDate = new Date(h.fecha);
                      const now = new Date();
                      return hDate.getMonth() === now.getMonth() && 
                             hDate.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Festivos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Leyenda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span>Día seleccionado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive" />
                  <span>Festivo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs">15</span>
                  <span>Con eventos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">S D</span>
                  <span>Fin de semana</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
