import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePushNotifications(userId: string | null) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(isSupported);

    if (isSupported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, [userId]);

  const checkExistingSubscription = useCallback(async () => {
    if (!userId) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await (reg as any).pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch {
      setIsSubscribed(false);
    }
  }, [userId]);

  const getVapidPublicKey = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('push-notifications', {
        body: { action: 'get-public-key' },
      });
      if (error || !data?.publicKey) {
        // Try to generate keys
        const { data: genData } = await supabase.functions.invoke('push-notifications', {
          body: { action: 'generate-keys' },
        });
        return genData?.publicKey || null;
      }
      return data.publicKey;
    } catch (err) {
      console.error('[push] Failed to get VAPID key:', err);
      return null;
    }
  };

  const subscribe = useCallback(async () => {
    if (!userId || !supported) return false;
    setLoading(true);

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast.error('Permiso de notificaciones denegado. Actívalo en la configuración del navegador.');
        return false;
      }

      // Get VAPID public key
      const vapidPublicKey = await getVapidPublicKey();
      if (!vapidPublicKey) {
        toast.error('Error al configurar notificaciones push');
        return false;
      }

      // Convert VAPID key to Uint8Array
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      // Subscribe to push
      const reg = await navigator.serviceWorker.ready;
      const subscription = await (reg as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subJson = subscription.toJSON();
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;

      if (!subJson.endpoint || !p256dh || !auth) {
        throw new Error('Invalid push subscription');
      }

      // Store subscription in database
      const { error } = await supabase
        .from('push_subscriptions' as any)
        .upsert({
          user_id: userId,
          endpoint: subJson.endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
        }, { onConflict: 'user_id,endpoint' });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success('¡Notificaciones push activadas!');
      return true;
    } catch (err: any) {
      console.error('[push] Subscribe error:', err);
      toast.error('Error al activar notificaciones push');
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, supported]);

  const unsubscribe = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await (reg as any).pushManager.getSubscription();
      
      if (sub) {
        await sub.unsubscribe();
        
        // Remove from database
        await supabase
          .from('push_subscriptions' as any)
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', sub.endpoint);
      }

      setIsSubscribed(false);
      toast.success('Notificaciones push desactivadas');
    } catch (err) {
      console.error('[push] Unsubscribe error:', err);
      toast.error('Error al desactivar notificaciones');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    permission,
    isSubscribed,
    loading,
    supported,
    subscribe,
    unsubscribe,
  };
}
