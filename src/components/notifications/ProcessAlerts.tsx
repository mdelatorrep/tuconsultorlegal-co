import { useState, useEffect } from 'react';
import { Bell, X, ExternalLink, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProcessAlert {
  id: string;
  type: 'new_actuation' | 'deadline_warning' | 'status_change';
  title: string;
  message: string;
  processRadicado: string;
  processId: string;
  createdAt: string;
  isRead: boolean;
}

interface ProcessAlertsProps {
  lawyerId: string;
  onNavigateToProcess?: (processId: string) => void;
}

export function ProcessAlerts({ lawyerId, onNavigateToProcess }: ProcessAlertsProps) {
  const [alerts, setAlerts] = useState<ProcessAlert[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAlerts();
    
    // Subscribe to real-time updates for new actuations
    const channel = supabase
      .channel('process-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'process_actuations',
          filter: `is_new=eq.true`
        },
        (payload) => {
          // Fetch the related process to check if it belongs to this lawyer
          handleNewActuation(payload.new as any);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lawyerId]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      
      // Get new actuations from last 7 days
      const { data: actuations, error } = await supabase
        .from('process_actuations')
        .select(`
          id,
          actuacion,
          anotacion,
          fecha_actuacion,
          created_at,
          is_new,
          monitored_processes!inner (
            id,
            radicado,
            lawyer_id
          )
        `)
        .eq('monitored_processes.lawyer_id', lawyerId)
        .eq('is_new', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedAlerts: ProcessAlert[] = (actuations || []).map((act: any) => ({
        id: act.id,
        type: 'new_actuation' as const,
        title: act.actuacion,
        message: act.anotacion || 'Nueva actuación registrada',
        processRadicado: act.monitored_processes.radicado,
        processId: act.monitored_processes.id,
        createdAt: act.created_at,
        isRead: !act.is_new
      }));

      setAlerts(formattedAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewActuation = async (actuation: any) => {
    // Verify the process belongs to this lawyer
    const { data: process } = await supabase
      .from('monitored_processes')
      .select('id, radicado, lawyer_id')
      .eq('id', actuation.monitored_process_id)
      .single();

    if (process?.lawyer_id === lawyerId) {
      const newAlert: ProcessAlert = {
        id: actuation.id,
        type: 'new_actuation',
        title: actuation.tipo_actuacion,
        message: actuation.descripcion || 'Nueva actuación registrada',
        processRadicado: process.radicado,
        processId: process.id,
        createdAt: actuation.created_at,
        isRead: false
      };

      setAlerts(prev => [newAlert, ...prev]);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      await supabase
        .from('process_actuations')
        .update({ is_new: false })
        .eq('id', alertId);

      setAlerts(prev => 
        prev.map(a => a.id === alertId ? { ...a, isRead: true } : a)
      );
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = alerts.filter(a => !a.isRead).map(a => a.id);
      
      await supabase
        .from('process_actuations')
        .update({ is_new: false })
        .in('id', unreadIds);

      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getAlertIcon = (type: ProcessAlert['type']) => {
    switch (type) {
      case 'new_actuation':
        return <Bell className="h-4 w-4 text-primary" />;
      case 'deadline_warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'status_change':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Marcar todas como leídas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No hay notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                    !alert.isRead ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    markAsRead(alert.id);
                    onNavigateToProcess?.(alert.processId);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{alert.title}</p>
                        {!alert.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs font-mono">
                          {alert.processRadicado.slice(-10)}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(alert.createdAt), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {alerts.length > 0 && (
          <div className="p-2 border-t">
            <Button variant="ghost" className="w-full" size="sm">
              Ver todas las notificaciones
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
