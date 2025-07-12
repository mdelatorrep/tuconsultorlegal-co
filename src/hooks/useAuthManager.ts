import { useEffect } from 'react';
import { AuthStorage } from '@/utils/authStorage';
import { useToast } from '@/hooks/use-toast';

export const useAuthManager = () => {
  const { toast } = useToast();

  useEffect(() => {
    // Ejecutar limpieza inicial
    AuthStorage.cleanupExpiredTokens();

    // Configurar limpieza periódica cada 5 minutos
    const cleanupInterval = setInterval(() => {
      const tokensBeforeCleanup = AuthStorage.getActiveTokens();
      AuthStorage.cleanupExpiredTokens();
      const tokensAfterCleanup = AuthStorage.getActiveTokens();

      // Notificar si se limpiaron tokens
      if (tokensBeforeCleanup.admin && !tokensAfterCleanup.admin) {
        toast({
          title: "Sesión administrativa expirada",
          description: "Tu sesión de administrador ha expirado.",
          variant: "destructive"
        });
      }
    }, 5 * 60 * 1000); // 5 minutos

    // Limpieza al cerrar la pestaña/navegador
    const handleBeforeUnload = () => {
      AuthStorage.cleanupExpiredTokens();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(cleanupInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [toast]);

  const getAuthHeaders = (type: 'admin' | 'lawyer' = 'admin') => {
    if (type === 'admin') {
      const adminAuth = AuthStorage.getAdminAuth();
      return adminAuth ? { 'authorization': adminAuth.token } : {};
    } else {
      const lawyerAuth = AuthStorage.getLawyerAuth();
      return lawyerAuth ? { 'authorization': lawyerAuth.token } : {};
    }
  };

  const clearAllSessions = () => {
    AuthStorage.clearAllAuth();
    toast({
      title: "Sesiones limpiadas",
      description: "Todas las sesiones han sido cerradas.",
    });
  };

  const getActiveTokensStatus = () => {
    return AuthStorage.getActiveTokens();
  };

  return {
    getAuthHeaders,
    clearAllSessions,
    getActiveTokensStatus
  };
};