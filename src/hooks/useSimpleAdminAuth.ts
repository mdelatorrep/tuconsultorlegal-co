import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SimpleAdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
  loginTime: number;
}

export const useSimpleAdminAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<SimpleAdminUser | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    try {
      const isAdmin = localStorage.getItem('admin_authenticated') === 'true';
      const loginTime = localStorage.getItem('admin_login_time');
      
      if (isAdmin && loginTime) {
        // Verificar si la sesión no ha expirado (24 horas)
        const loginTimestamp = parseInt(loginTime);
        const now = Date.now();
        const sessionDuration = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
        
        if (now - loginTimestamp < sessionDuration) {
          const mockUser: SimpleAdminUser = {
            id: 'admin-user',
            email: 'admin@tuconsultorlegal.co',
            isAdmin: true,
            loginTime: loginTimestamp
          };
          
          setUser(mockUser);
          setIsAuthenticated(true);
        } else {
          // Sesión expirada
          logout();
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem('admin_authenticated');
      localStorage.removeItem('admin_login_time');
      
      setIsAuthenticated(false);
      setUser(null);
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente.",
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getAuthHeaders = () => {
    // Para edge functions que requieren autenticación, puedes usar un token simple
    return isAuthenticated ? { 
      'authorization': `Bearer admin-${Date.now()}`,
      'x-admin-auth': 'true'
    } : {};
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    logout,
    checkAuthStatus,
    getAuthHeaders
  };
};