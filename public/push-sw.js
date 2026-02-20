// Push notification event handler for service worker
self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || data.message || 'Nueva notificación',
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || data.action_url || '/',
        notificationId: data.notification_id,
      },
      actions: [
        { action: 'open', title: 'Ver' },
        { action: 'dismiss', title: 'Cerrar' },
      ],
      tag: data.tag || 'praxis-hub-notification',
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Praxis Hub', options)
    );
  } catch (e) {
    console.error('[push-sw] Error processing push:', e);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(url);
    })
  );
});
