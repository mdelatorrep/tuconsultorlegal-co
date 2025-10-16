import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detectar si ya está instalado
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(isInStandaloneMode);

    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Listener para el evento beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Mostrar prompt después de un delay (mejor UX)
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Para iOS, mostrar después de algunas visitas
    if (iOS && !isInStandaloneMode) {
      const visitCount = parseInt(localStorage.getItem('pwa-visit-count') || '0');
      localStorage.setItem('pwa-visit-count', String(visitCount + 1));
      
      if (visitCount >= 2) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA instalada');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // No mostrar si ya está instalado o fue previamente rechazado
  if (isStandalone || localStorage.getItem('pwa-prompt-dismissed') === 'true') {
    return null;
  }

  // No mostrar si no hay prompt ni es iOS
  if (!showPrompt || (!deferredPrompt && !isIOS)) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#0372e8] to-[#0a8fff] flex items-center justify-center flex-shrink-0">
                <img 
                  src="/pwa-192x192.png" 
                  alt="tuconsultorlegal.co" 
                  className="w-10 h-10"
                />
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  Instalar tuconsultorlegal.co
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {isIOS 
                    ? 'Agrega esta app a tu pantalla de inicio para acceso rápido y funcionalidad offline.'
                    : 'Instala nuestra app para acceso rápido y funcionalidad offline.'
                  }
                </p>

                {isIOS ? (
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <p className="flex items-center gap-2">
                      <span className="text-[#0372e8]">1.</span>
                      Toca el botón <Share className="w-4 h-4 inline" /> (Compartir) en Safari
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-[#0372e8]">2.</span>
                      Selecciona "Agregar a pantalla de inicio"
                    </p>
                  </div>
                ) : (
                  <Button 
                    onClick={handleInstallClick}
                    className="w-full bg-[#0372e8] hover:bg-[#0260c7] text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Instalar App
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
