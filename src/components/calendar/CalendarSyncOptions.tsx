import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Calendar as CalendarIcon, 
  Link, 
  Copy, 
  Check,
  Loader2,
  ExternalLink,
  Unlink,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { formatDateLocal } from '@/lib/date-utils';

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
  onEventsImported?: () => void;
}

// Generate iCal format content (kept as fallback)
function generateICalContent(events: CalendarEvent[], calendarName: string): string {
  const escapeText = (text: string) => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const formatDateForICal = (dateString: string, allDay: boolean) => {
    const parts = dateString.split('-');
    if (allDay && parts.length === 3) {
      return parts.join('');
    }
    const date = new Date(dateString);
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
    
    lines.push(`CATEGORIES:${event.event_type.toUpperCase()}`);
    
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

export function CalendarSyncOptions({ lawyerId, events, onClose, onEventsImported }: CalendarSyncOptionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);

  useEffect(() => {
    checkGoogleConnection();
  }, [lawyerId]);

  const checkGoogleConnection = async () => {
    try {
      setCheckingConnection(true);
      const { data, error } = await supabase
        .from('lawyer_google_tokens' as any)
        .select('google_email, last_synced_at')
        .eq('lawyer_id', lawyerId)
        .maybeSingle();

      if (data) {
        setGoogleConnected(true);
        setGoogleEmail((data as any).google_email);
        setLastSynced((data as any).last_synced_at);
      }
    } catch (error) {
      console.error('Error checking Google connection:', error);
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setIsConnecting(true);
      
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: {
          action: 'get_auth_url',
          lawyer_id: lawyerId,
          redirect_uri: window.location.origin + '/google-calendar-callback'
        }
      });

      if (error) throw error;

      if (data?.auth_url) {
        // Open Google OAuth in a popup
        const popup = window.open(data.auth_url, 'google-auth', 'width=600,height=700,left=200,top=100');
        
        // Listen for callback
        const handleMessage = async (event: MessageEvent) => {
          if (event.data?.type === 'google-calendar-callback' && event.data?.code) {
            window.removeEventListener('message', handleMessage);
            popup?.close();
            
            // Exchange code for tokens
            const { data: tokenData, error: tokenError } = await supabase.functions.invoke('google-calendar-auth', {
              body: {
                action: 'exchange_code',
                code: event.data.code,
                lawyer_id: lawyerId,
                redirect_uri: window.location.origin + '/google-calendar-callback'
              }
            });

            if (tokenError) throw tokenError;

            setGoogleConnected(true);
            setGoogleEmail(tokenData?.email || null);
            toast.success('¡Google Calendar conectado exitosamente!');
            
            // Auto-sync after connecting
            handleSyncEvents();
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        // Cleanup after timeout
        setTimeout(() => {
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
        }, 120000);
      }
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      toast.error('Error al conectar con Google Calendar. Verifica que las credenciales estén configuradas.');
      setIsConnecting(false);
    }
  };

  const handleSyncEvents = async () => {
    try {
      setIsSyncing(true);
      
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'sync_all',
          lawyer_id: lawyerId
        }
      });

      if (error) throw error;

      const synced = data?.synced_count || 0;
      const imported = data?.imported_count || 0;
      
      toast.success(`Sincronización completa: ${synced} exportados, ${imported} importados`);
      setLastSynced(new Date().toISOString());
      onEventsImported?.();
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Error al sincronizar con Google Calendar');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      
      const { error } = await supabase
        .from('lawyer_google_tokens')
        .delete()
        .eq('lawyer_id', lawyerId);

      if (error) throw error;

      setGoogleConnected(false);
      setGoogleEmail(null);
      setLastSynced(null);
      toast.success('Google Calendar desconectado');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Error al desconectar');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleExportICS = async () => {
    setIsExporting(true);
    try {
      const icalContent = generateICalContent(events, 'Calendario Legal - Praxis Hub');
      const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `calendario-legal-${format(new Date(), 'yyyy-MM-dd')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Archivo iCal descargado');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Google Calendar Connection */}
      <Card className={`border-2 ${googleConnected ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/10' : 'border-primary/30'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" 
              alt="Google Calendar" 
              className="h-5 w-5"
            />
            Google Calendar
            {googleConnected && (
              <Badge variant="outline" className="text-green-600 border-green-600 ml-2">
                <Check className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {googleConnected 
              ? `Sincronizado con ${googleEmail || 'tu cuenta de Google'}`
              : 'Conecta tu Google Calendar para sincronización automática en tiempo real'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {checkingConnection ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : googleConnected ? (
            <>
              {lastSynced && (
                <p className="text-xs text-muted-foreground">
                  Última sincronización: {format(new Date(lastSynced), "d MMM yyyy HH:mm")}
                </p>
              )}
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={handleSyncEvents}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sincronizar Ahora
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="text-destructive hover:text-destructive"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          ) : (
            <Button 
              className="w-full" 
              onClick={handleConnectGoogle}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link className="h-4 w-4 mr-2" />
              )}
              Conectar Google Calendar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Fallback: Export iCal */}
      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Download className="h-4 w-4" />
            Exportar como archivo iCal (alternativa)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline"
            size="sm"
            className="w-full" 
            disabled={isExporting || events.length === 0}
            onClick={handleExportICS}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Descargar .ics ({events.length} eventos)
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Importa manualmente en Google Calendar, Apple Calendar u Outlook
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        🕐 Todos los eventos se sincronizan en zona horaria Colombia (GMT-5)
      </p>
    </div>
  );
}
