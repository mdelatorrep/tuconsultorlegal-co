import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 right-4 z-50"
        >
          <div className={`rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 ${
            isOnline 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Conexión restaurada
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Estás de nuevo en línea
                  </p>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    Sin conexión
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    Algunas funciones pueden no estar disponibles
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
