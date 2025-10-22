import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PWAUpdatePrompt = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Registrar service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          setRegistration(reg);
          
          // Detectar actualizaciones
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setNeedRefresh(true);
                }
              });
            }
          });

          // Chequear actualizaciones cada hora
          setInterval(() => {
            reg.update();
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          console.error('Error al registrar Service Worker:', error);
        });
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Ocultar el modal inmediatamente
      setNeedRefresh(false);
      
      // Escuchar cuando el nuevo service worker tome el control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
      
      // Enviar mensaje al service worker para activarse
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-full px-4"
        >
          <div className="bg-background border-2 border-primary/50 rounded-xl shadow-2xl p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <RefreshCw className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Nueva versión disponible
                </p>
                <p className="text-xs text-muted-foreground">
                  Actualiza para obtener las últimas mejoras
                </p>
              </div>
              <Button 
                onClick={handleUpdate}
                size="sm"
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
              >
                Actualizar
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
