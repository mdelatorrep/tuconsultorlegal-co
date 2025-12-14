import { useEffect, useCallback } from 'react';
import { AuthStorage } from '@/utils/authStorage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

  // Versión síncrona para admin (usa sessionStorage)
  const getAuthHeaders = (type: 'admin' | 'lawyer' = 'admin'): Record<string, string> => {
    if (type === 'admin') {
      const adminAuth = AuthStorage.getAdminAuth();
      return adminAuth ? { 'authorization': adminAuth.token } : {};
    } else {
      // Para abogados, usar sessionStorage como fallback síncrono
      const lawyerAuth = AuthStorage.getLawyerAuth();
      return lawyerAuth ? { 'authorization': lawyerAuth.token } : {};
    }
  };

  // Versión asíncrona para abogados (usa Supabase Auth)
  const getAuthHeadersAsync = useCallback(async (type: 'admin' | 'lawyer' = 'admin'): Promise<Record<string, string>> => {
    if (type === 'admin') {
      const adminAuth = AuthStorage.getAdminAuth();
      return adminAuth ? { 'authorization': adminAuth.token } : {};
    } else {
      // Para abogados, obtener el token de Supabase Auth
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return { 'authorization': `Bearer ${session.access_token}` };
      }
      // Fallback a sessionStorage si no hay sesión de Supabase
      const lawyerAuth = AuthStorage.getLawyerAuth();
      return lawyerAuth ? { 'authorization': lawyerAuth.token } : {};
    }
  }, []);

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
    getAuthHeadersAsync,
    clearAllSessions,
    getActiveTokensStatus
  };
};