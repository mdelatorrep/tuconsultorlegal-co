import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin,
  Video,
  Loader2,
  Plus,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, setHours, setMinutes, isBefore, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  location: string | null;
  meeting_url: string | null;
}

interface AppointmentSchedulerProps {
  clientId: string;
  lawyerId: string;
  lawyerName: string;
}

export function AppointmentScheduler({ clientId, lawyerId, lawyerName }: AppointmentSchedulerProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  
  // Schedule form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('60');

  useEffect(() => {
    loadAppointments();
  }, [clientId]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_appointments')
        .select('*')
        .eq('client_id', clientId)
        .eq('lawyer_id', lawyerId)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime || !title.trim()) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setScheduling(true);

      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledAt = setMinutes(setHours(selectedDate, hours), minutes);

      const { error } = await supabase
        .from('client_appointments')
        .insert({
          client_id: clientId,
          lawyer_id: lawyerId,
          title,
          description: notes || null,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: parseInt(duration),
          status: 'scheduled'
        });

      if (error) throw error;

      toast.success('Cita solicitada correctamente');
      setShowScheduleDialog(false);
      resetForm();
      loadAppointments();
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      toast.error('Error al solicitar la cita');
    } finally {
      setScheduling(false);
    }
  };

  const resetForm = () => {
    setSelectedDate(undefined);
    setSelectedTime('');
    setTitle('');
    setNotes('');
    setDuration('60');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-500">Programada</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-500">Confirmada</Badge>;
      case 'completed':
        return <Badge variant="outline">Completada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30'
  ];

  const upcomingAppointments = appointments.filter(
    a => a.status !== 'cancelled' && a.status !== 'completed'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Schedule New Appointment */}
      <Card>
        <CardHeader>
          <CardTitle>Agendar Cita</CardTitle>
          <CardDescription>
            Solicita una cita con {lawyerName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
            <DialogTrigger asChild>
              <Button className="w-full mb-4">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Cita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Solicitar Nueva Cita</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Motivo de la Cita *</Label>
                  <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ej: Consulta sobre contrato"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha *</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={es}
                    disabled={(date) => 
                      isBefore(date, new Date()) || 
                      date.getDay() === 0 || 
                      date.getDay() === 6
                    }
                    className="rounded-md border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora *</Label>
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map(time => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Duración</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="90">1.5 horas</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notas adicionales</Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Información adicional sobre el motivo de la cita..."
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSchedule}
                  disabled={scheduling || !selectedDate || !selectedTime || !title.trim()}
                >
                  {scheduling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Solicitando...
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Solicitar Cita
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Horarios disponibles</h4>
            <p className="text-sm text-muted-foreground">
              Lunes a Viernes: 8:00 AM - 6:00 PM
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              La cita quedará pendiente de confirmación por parte del abogado.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Próximas Citas</CardTitle>
          <CardDescription>
            {upcomingAppointments.length} cita(s) programada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No tienes citas programadas</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {upcomingAppointments.map(appointment => (
                  <div 
                    key={appointment.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium">{appointment.title}</p>
                      {getStatusBadge(appointment.status)}
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        {format(new Date(appointment.scheduled_at), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(new Date(appointment.scheduled_at), "HH:mm", { locale: es })}
                        {' - '}
                        {appointment.duration_minutes} minutos
                      </div>
                      {appointment.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {appointment.location}
                        </div>
                      )}
                      {appointment.meeting_url && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => window.open(appointment.meeting_url!, '_blank')}
                        >
                          <Video className="h-4 w-4 mr-2" />
                          Unirse a videollamada
                        </Button>
                      )}
                    </div>
                    
                    {appointment.description && (
                      <p className="text-sm mt-3 p-2 bg-muted/50 rounded">
                        {appointment.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
