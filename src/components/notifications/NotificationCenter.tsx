import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  FileText, 
  Users, 
  Radar, 
  CreditCard, 
  Calendar, 
  Settings,
  Check,
  CheckCheck,
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  priority: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface NotificationCenterProps {
  lawyerId: string;
  onNavigate?: (url: string) => void;
}

const getNotificationIcon = (type: string, entityType: string | null) => {
  switch (type) {
    case 'new_lead':
      return <Users className="h-4 w-4 text-blue-500" />;
    case 'document_status':
      return <FileText className="h-4 w-4 text-green-500" />;
    case 'process_update':
      return <Radar className="h-4 w-4 text-purple-500" />;
    case 'credit_low':
    case 'credit_recharge':
      return <CreditCard className="h-4 w-4 text-amber-500" />;
    case 'sla_alert':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'calendar_reminder':
      return <Calendar className="h-4 w-4 text-indigo-500" />;
    case 'system':
      return <Settings className="h-4 w-4 text-gray-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'border-l-red-500 bg-red-50 dark:bg-red-950/20';
    case 'high':
      return 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20';
    default:
      return 'border-l-transparent';
  }
};

const getCategoryForType = (type: string): string => {
  switch (type) {
    case 'new_lead':
      return 'crm';
    case 'document_status':
    case 'sla_alert':
      return 'documents';
    case 'process_update':
      return 'processes';
    case 'credit_low':
    case 'credit_recharge':
      return 'credits';
    case 'calendar_reminder':
      return 'calendar';
    default:
      return 'system';
  }
};

export function NotificationCenter({ lawyerId, onNavigate }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (lawyerId) {
      loadNotifications();
      
      // Subscribe to realtime notifications
      const channel = supabase
        .channel('lawyer-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'lawyer_notifications',
            filter: `lawyer_id=eq.${lawyerId}`
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [lawyerId]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('lawyer_notifications')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('lawyer_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('lawyer_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.action_url && onNavigate) {
      onNavigate(notification.action_url);
      setIsOpen(false);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.is_read;
    return getCategoryForType(n.notification_type) === activeTab;
  });

  const renderNotification = (notification: Notification) => (
    <div
      key={notification.id}
      className={`p-3 border-l-4 cursor-pointer hover:bg-muted/50 transition-colors ${
        getPriorityColor(notification.priority)
      } ${!notification.is_read ? 'bg-primary/5' : ''}`}
      onClick={() => handleNotificationClick(notification)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {getNotificationIcon(notification.notification_type, notification.entity_type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium truncate ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
              {notification.title}
            </span>
            {!notification.is_read && (
              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
            </span>
            {notification.action_url && (
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas leídas
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-9 rounded-none border-b">
            <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              No leídas
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 text-xs px-1">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs">Docs</TabsTrigger>
            <TabsTrigger value="crm" className="text-xs">CRM</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-80">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No hay notificaciones</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map(renderNotification)}
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationCenter;
