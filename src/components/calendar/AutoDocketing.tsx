import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Loader2, Calendar, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExtractedDate {
  id: string;
  date: string;
  type: string;
  description: string;
  priority: string;
  selected: boolean;
}

interface AutoDocketingProps {
  lawyerId: string;
  onEventsCreated?: () => void;
}

export function AutoDocketing({ lawyerId, onEventsCreated }: AutoDocketingProps) {
  const [documentText, setDocumentText] = useState('');
  const [extractedDates, setExtractedDates] = useState<ExtractedDate[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);

  const extractDates = async () => {
    if (!documentText.trim()) {
      toast.error('Ingresa el texto del documento');
      return;
    }

    try {
      setExtracting(true);
      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: {
          action: 'extract_dates',
          text: documentText
        }
      });

      if (error) throw error;
      
      const dates: ExtractedDate[] = (data.dates || []).map((d: any, i: number) => ({
        id: `date-${i}`,
        date: d.date,
        type: d.type || 'evento',
        description: d.description,
        priority: d.priority || 'media',
        selected: true
      }));
      
      setExtractedDates(dates);
      
      if (dates.length === 0) {
        toast.info('No se encontraron fechas en el documento');
      } else {
        toast.success(`Se encontraron ${dates.length} fecha(s)`);
      }
    } catch (error) {
      console.error('Error extracting dates:', error);
      toast.error('Error al extraer fechas');
    } finally {
      setExtracting(false);
    }
  };

  const toggleDate = (id: string) => {
    setExtractedDates(dates => 
      dates.map(d => d.id === id ? { ...d, selected: !d.selected } : d)
    );
  };

  const saveSelectedDates = async () => {
    const selectedDates = extractedDates.filter(d => d.selected);
    
    if (selectedDates.length === 0) {
      toast.error('Selecciona al menos una fecha');
      return;
    }

    try {
      setSaving(true);
      
      const events = selectedDates.map(d => ({
        lawyer_id: lawyerId,
        title: d.description,
        event_type: d.type === 'vencimiento' ? 'deadline' : d.type,
        start_date: d.date,
        end_date: d.date,
        all_day: true
      }));

      const { error } = await supabase
        .from('legal_calendar_events')
        .insert(events);

      if (error) throw error;
      
      toast.success(`${selectedDates.length} evento(s) guardado(s)`);
      onEventsCreated?.();
    } catch (error) {
      console.error('Error saving events:', error);
      toast.error('Error al guardar eventos');
    } finally {
      setSaving(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'media': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'baja': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'audiencia': return '⚖️';
      case 'vencimiento': return '⏰';
      case 'presentacion': return '📄';
      case 'notificacion': return '📬';
      default: return '📅';
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Document Input */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Texto del Documento
        </Label>
        <Textarea
          placeholder="Pega aquí el texto del auto, providencia o documento judicial para extraer fechas automáticamente..."
          value={documentText}
          onChange={e => setDocumentText(e.target.value)}
          className="min-h-[200px] font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          La IA analizará el documento y extraerá fechas importantes como audiencias, vencimientos y plazos.
        </p>
      </div>

      {/* Extract Button */}
      <Button 
        className="w-full" 
        onClick={extractDates}
        disabled={!documentText.trim() || extracting}
      >
        {extracting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        Extraer Fechas con IA
      </Button>

      {/* Extracted Dates */}
      {extractedDates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Fechas Encontradas</Label>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setExtractedDates(dates => dates.map(d => ({ ...d, selected: true })))}
            >
              Seleccionar todas
            </Button>
          </div>
          
          <ScrollArea className="h-[250px] rounded-lg border p-4">
            <div className="space-y-3">
              {extractedDates.map(dateItem => (
                <div 
                  key={dateItem.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    dateItem.selected ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={dateItem.selected}
                    onCheckedChange={() => toggleDate(dateItem.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTypeIcon(dateItem.type)}</span>
                      <p className="font-medium">{dateItem.description}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(dateItem.date), "d 'de' MMMM yyyy", { locale: es })}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${getPriorityColor(dateItem.priority)}`}>
                        {dateItem.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {dateItem.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Save Button */}
          <Button 
            className="w-full" 
            onClick={saveSelectedDates}
            disabled={!extractedDates.some(d => d.selected) || saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Guardar {extractedDates.filter(d => d.selected).length} Evento(s) en Calendario
          </Button>
        </div>
      )}

      {/* Tips */}
      <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg space-y-1">
        <p className="font-medium flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Consejos:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Incluye el texto completo del auto o providencia</li>
          <li>La IA detectará audiencias, términos y vencimientos</li>
          <li>Revisa las fechas extraídas antes de guardar</li>
          <li>Puedes deseleccionar fechas que no sean relevantes</li>
        </ul>
      </div>
    </div>
  );
}
