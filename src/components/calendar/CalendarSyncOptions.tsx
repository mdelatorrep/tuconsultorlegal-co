import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download, 
  Calendar as CalendarIcon, 
  Link, 
  Copy, 
  Check,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

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

interface CalendarSyncOptionsProps {
  lawyerId: string;
  events: CalendarEvent[];
  onClose?: () => void;
}

// Generate iCal format content
function generateICalContent(events: CalendarEvent[], calendarName: string): string {
  const escapeText = (text: string) => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const formatDateForICal = (dateString: string, allDay: boolean) => {
    const date = new Date(dateString);
    if (allDay) {
      return format(date, "yyyyMMdd");
    }
    // Convert to UTC for iCal
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tu Consulta Legal//Calendario Legal//ES',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  events.forEach(event => {
    const uid = `${event.id}@tuconsultalegal.co`;
    const dtStart = formatDateForICal(event.start_date, event.all_day);
    const dtEnd = event.end_date 
      ? formatDateForICal(event.end_date, event.all_day)
      : formatDateForICal(event.start_date, event.all_day);
    
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
    
    if (event.all_day) {
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    } else {
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
    }
    
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    }
    
    if (event.location) {
      lines.push(`LOCATION:${escapeText(event.location)}`);
    }
    
    // Add event type as category
    lines.push(`CATEGORIES:${event.event_type.toUpperCase()}`);
    
    // Mark completed events
    if (event.is_completed) {
      lines.push('STATUS:COMPLETED');
    } else {
      lines.push('STATUS:CONFIRMED');
    }
    
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  
  return lines.join('\r\n');
}

export function CalendarSyncOptions({ lawyerId, events, onClose }: CalendarSyncOptionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExportICS = async () => {
    setIsExporting(true);
    try {
      const icalContent = generateICalContent(events, 'Calendario Legal - Tu Consulta Legal');
      
      // Create blob and download
      const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `calendario-legal-${format(new Date(), 'yyyy-MM-dd')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Archivo iCal descargado correctamente');
    } catch (error) {
      console.error('Error exporting calendar:', error);
      toast.error('Error al exportar el calendario');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportUpcoming = async () => {
    setIsExporting(true);
    try {
      const upcomingEvents = events.filter(e => new Date(e.start_date) >= new Date());
      
      if (upcomingEvents.length === 0) {
        toast.error('No hay eventos próximos para exportar');
        return;
      }
      
      const icalContent = generateICalContent(upcomingEvents, 'Calendario Legal - Próximos Eventos');
      
      const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `calendario-legal-proximos-${format(new Date(), 'yyyy-MM-dd')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`${upcomingEvents.length} eventos exportados correctamente`);
    } catch (error) {
      console.error('Error exporting calendar:', error);
      toast.error('Error al exportar el calendario');
    } finally {
      setIsExporting(false);
    }
  };

  const copyGoogleCalendarInstructions = () => {
    const instructions = `Para importar a Google Calendar:
1. Descarga el archivo .ics
2. Ve a calendar.google.com
3. Haz clic en el ícono de engranaje → Configuración
4. En el menú lateral, haz clic en "Importar y exportar"
5. Selecciona "Importar" y elige el archivo .ics descargado
6. Selecciona el calendario donde quieres importar los eventos
7. Haz clic en "Importar"`;
    
    navigator.clipboard.writeText(instructions);
    setCopied(true);
    toast.success('Instrucciones copiadas al portapapeles');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer" onClick={handleExportICS}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Exportar Todos
            </CardTitle>
            <CardDescription>
              Descarga todos tus eventos en formato iCal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              disabled={isExporting || events.length === 0}
              onClick={(e) => {
                e.stopPropagation();
                handleExportICS();
              }}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Descargar .ics ({events.length} eventos)
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer" onClick={handleExportUpcoming}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Solo Próximos
            </CardTitle>
            <CardDescription>
              Exporta solo los eventos futuros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              className="w-full" 
              disabled={isExporting}
              onClick={(e) => {
                e.stopPropagation();
                handleExportUpcoming();
              }}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CalendarIcon className="h-4 w-4 mr-2" />
              )}
              Exportar Próximos
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Link className="h-5 w-5" />
            Cómo importar a tu calendario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Calendar */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" 
                alt="Google Calendar" 
                className="h-5 w-5"
              />
              <h4 className="font-semibold">Google Calendar</h4>
            </div>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>Descarga el archivo .ics</li>
              <li>Ve a <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">calendar.google.com</a></li>
              <li>Configuración → Importar y exportar → Importar</li>
              <li>Selecciona el archivo .ics y el calendario destino</li>
            </ol>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={copyGoogleCalendarInstructions}
              className="text-xs"
            >
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              Copiar instrucciones
            </Button>
          </div>

          {/* Apple Calendar */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🍎</span>
              <h4 className="font-semibold">Apple Calendar (macOS/iOS)</h4>
            </div>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>Descarga el archivo .ics</li>
              <li><strong>macOS:</strong> Haz doble clic en el archivo para abrirlo en Calendario</li>
              <li><strong>iOS:</strong> Abre el archivo desde Archivos o correo</li>
              <li>Confirma la importación cuando se te solicite</li>
            </ol>
          </div>

          {/* Outlook */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📧</span>
              <h4 className="font-semibold">Microsoft Outlook</h4>
            </div>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>Descarga el archivo .ics</li>
              <li>Abre Outlook y ve a Archivo → Abrir y exportar → Importar/Exportar</li>
              <li>Selecciona "Importar un archivo iCalendar (.ics)"</li>
              <li>Elige el archivo descargado</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Note */}
      <p className="text-xs text-muted-foreground text-center">
        💡 Para mantener tu calendario sincronizado, exporta e importa regularmente tus eventos.
      </p>
    </div>
  );
}
