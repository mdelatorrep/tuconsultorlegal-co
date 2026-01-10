import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NewEventDialogProps {
  lawyerId: string;
  selectedDate?: Date;
  onEventCreated?: () => void;
}

const EVENT_TYPES = [
  { value: 'audiencia', label: 'Audiencia', icon: '⚖️' },
  { value: 'deadline', label: 'Vencimiento', icon: '⏰' },
  { value: 'filing', label: 'Presentación', icon: '📄' },
  { value: 'meeting', label: 'Reunión', icon: '👥' },
  { value: 'reminder', label: 'Recordatorio', icon: '🔔' },
  { value: 'other', label: 'Otro', icon: '📅' },
];

export function NewEventDialog({ lawyerId, selectedDate, onEventCreated }: NewEventDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('other');
  const [startDate, setStartDate] = useState<Date | undefined>(selectedDate || new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [allDay, setAllDay] = useState(true);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    if (!startDate) {
      toast.error('La fecha de inicio es requerida');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('legal_calendar_events')
        .insert({
          lawyer_id: lawyerId,
          title: title.trim(),
          description: description.trim() || null,
          event_type: eventType,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: endDate ? format(endDate, 'yyyy-MM-dd') : format(startDate, 'yyyy-MM-dd'),
          all_day: allDay,
          location: location.trim() || null,
          is_completed: false
        });

      if (error) throw error;

      toast.success('Evento creado exitosamente');
      
      // Reset form
      setTitle('');
      setDescription('');
      setEventType('other');
      setEndDate(undefined);
      setLocation('');
      setAllDay(true);
      
      onEventCreated?.();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Error al crear el evento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Audiencia inicial caso García"
        />
      </div>

      {/* Event Type */}
      <div className="space-y-2">
        <Label>Tipo de Evento</Label>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fecha de Inicio *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "d MMM yyyy", { locale: es }) : "Seleccionar"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Fecha de Fin</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "d MMM yyyy", { locale: es }) : "Opcional"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                locale={es}
                disabled={(date) => startDate ? date < startDate : false}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* All Day Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="all-day">Todo el día</Label>
        <Switch
          id="all-day"
          checked={allDay}
          onCheckedChange={setAllDay}
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">Ubicación</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ej: Juzgado 5 Civil del Circuito"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalles adicionales del evento..."
          rows={3}
        />
      </div>

      {/* Submit Button */}
      <Button 
        className="w-full" 
        onClick={handleSubmit}
        disabled={loading || !title.trim() || !startDate}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Plus className="h-4 w-4 mr-2" />
        )}
        Crear Evento
      </Button>
    </div>
  );
}
