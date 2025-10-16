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
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
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
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-[#0372e8] flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Nueva versión disponible
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Actualiza para obtener las últimas mejoras
                </p>
              </div>
              <Button 
                onClick={handleUpdate}
                size="sm"
                className="bg-[#0372e8] hover:bg-[#0260c7] text-white"
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
