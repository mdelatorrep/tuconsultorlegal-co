import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushNotificationToggleProps {
  userId: string;
}

export function PushNotificationToggle({ userId }: PushNotificationToggleProps) {
  const { permission, isSubscribed, loading, supported, subscribe, unsubscribe } = usePushNotifications(userId);

  if (!supported) return null;

  if (permission === 'denied') {
    return (
      <Button variant="ghost" size="sm" disabled className="text-muted-foreground text-xs gap-1.5">
        <BellOff className="h-3.5 w-3.5" />
        Push bloqueado
      </Button>
    );
  }

  return (
    <Button
      variant={isSubscribed ? 'outline' : 'default'}
      size="sm"
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={loading}
      className="gap-1.5 text-xs"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="h-3.5 w-3.5" />
      ) : (
        <BellOff className="h-3.5 w-3.5" />
      )}
      {isSubscribed ? 'Push activo' : 'Activar push'}
    </Button>
  );
}
