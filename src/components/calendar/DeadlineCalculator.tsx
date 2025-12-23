import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Calculator, Loader2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DeadlineCalculatorProps {
  lawyerId: string;
  onEventCreated?: () => void;
}

const TERM_TYPES = [
  { value: 'contestacion_demanda_cgp', label: 'Contestación demanda (CGP)', days: 20, normativa: 'Art. 96 CGP' },
  { value: 'recurso_reposicion', label: 'Recurso de reposición', days: 3, normativa: 'Art. 318 CGP' },
  { value: 'recurso_apelacion', label: 'Recurso de apelación', days: 3, normativa: 'Art. 322 CGP' },
  { value: 'recurso_casacion', label: 'Recurso de casación', days: 5, normativa: 'Art. 336 CGP' },
  { value: 'accion_tutela', label: 'Respuesta tutela', days: 2, normativa: 'Decreto 2591/1991' },
  { value: 'demanda_cpaca', label: 'Demanda contenciosa (CPACA)', days: 120, normativa: 'Art. 164 CPACA' },
  { value: 'contestacion_cpaca', label: 'Contestación demanda (CPACA)', days: 30, normativa: 'Art. 172 CPACA' },
  { value: 'alegatos_conclusion', label: 'Alegatos de conclusión', days: 10, normativa: 'Art. 373 CGP' },
  { value: 'subsanar_demanda', label: 'Subsanar demanda', days: 5, normativa: 'Art. 90 CGP' },
  { value: 'solicitud_pruebas', label: 'Solicitud de pruebas', days: 10, normativa: 'Art. 173 CGP' },
  { value: 'custom', label: 'Personalizado', days: 0, normativa: '' }
];

export function DeadlineCalculator({ lawyerId, onEventCreated }: DeadlineCalculatorProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [termType, setTermType] = useState<string>('');
  const [customDays, setCustomDays] = useState<number>(0);
  const [eventTitle, setEventTitle] = useState('');
  const [calculatedDate, setCalculatedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const selectedTerm = TERM_TYPES.find(t => t.value === termType);
  const daysToAdd = termType === 'custom' ? customDays : (selectedTerm?.days || 0);

  const calculateDeadline = async () => {
    if (!startDate || daysToAdd <= 0) {
      toast.error('Selecciona una fecha de inicio y un tipo de término');
      return;
    }

    try {
      setCalculating(true);
      const { data, error } = await supabase.functions.invoke('calculate-legal-deadlines', {
        body: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          termType: termType === 'custom' ? 'custom' : termType,
          days: daysToAdd
        }
      });

      if (error) throw error;
      
      setCalculatedDate(new Date(data.deadline));
      setEventTitle(selectedTerm?.label || `Vencimiento ${daysToAdd} días hábiles`);
    } catch (error) {
      console.error('Error calculating deadline:', error);
      toast.error('Error al calcular el término');
    } finally {
      setCalculating(false);
    }
  };

  const saveAsEvent = async () => {
    if (!calculatedDate || !eventTitle.trim()) {
      toast.error('Calcula el término primero');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('legal_calendar_events')
        .insert({
          lawyer_id: lawyerId,
          title: eventTitle,
          description: selectedTerm?.normativa ? `Según ${selectedTerm.normativa}` : null,
          event_type: 'deadline',
          start_date: format(calculatedDate, 'yyyy-MM-dd'),
          end_date: format(calculatedDate, 'yyyy-MM-dd'),
          all_day: true
        });

      if (error) throw error;
      
      toast.success('Evento guardado en el calendario');
      onEventCreated?.();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Error al guardar el evento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Start Date */}
      <div className="space-y-2">
        <Label>Fecha de Inicio (Notificación / Acto)</Label>
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
              {startDate ? format(startDate, "PPP", { locale: es }) : "Seleccionar fecha"}
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

      {/* Term Type */}
      <div className="space-y-2">
        <Label>Tipo de Término</Label>
        <Select value={termType} onValueChange={setTermType}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo de término" />
          </SelectTrigger>
          <SelectContent>
            {TERM_TYPES.map(term => (
              <SelectItem key={term.value} value={term.value}>
                <div className="flex items-center justify-between w-full gap-4">
                  <span>{term.label}</span>
                  {term.days > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {term.days} días
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTerm?.normativa && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            {selectedTerm.normativa}
          </p>
        )}
      </div>

      {/* Custom Days */}
      {termType === 'custom' && (
        <div className="space-y-2">
          <Label>Días Hábiles</Label>
          <Input
            type="number"
            min={1}
            value={customDays}
            onChange={e => setCustomDays(parseInt(e.target.value) || 0)}
            placeholder="Ingresa el número de días hábiles"
          />
        </div>
      )}

      {/* Calculate Button */}
      <Button 
        className="w-full" 
        onClick={calculateDeadline}
        disabled={!startDate || daysToAdd <= 0 || calculating}
      >
        {calculating ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Calculator className="h-4 w-4 mr-2" />
        )}
        Calcular Término
      </Button>

      {/* Result */}
      {calculatedDate && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Fecha de Vencimiento</p>
            <p className="text-2xl font-bold text-primary">
              {format(calculatedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              ({daysToAdd} días hábiles desde {format(startDate!, "d 'de' MMMM", { locale: es })})
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Título del Evento</Label>
            <Input
              value={eventTitle}
              onChange={e => setEventTitle(e.target.value)}
              placeholder="Nombre del evento"
            />
          </div>
          
          <Button 
            className="w-full" 
            variant="default"
            onClick={saveAsEvent}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CalendarIcon className="h-4 w-4 mr-2" />
            )}
            Guardar en Calendario
          </Button>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
        <p className="font-medium mb-1">Nota:</p>
        <p>Los términos se calculan excluyendo sábados, domingos y festivos colombianos según el CGP y CPACA.</p>
      </div>
    </div>
  );
}
