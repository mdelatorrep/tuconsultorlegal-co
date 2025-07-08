import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

interface LoginResponse {
  success: boolean;
  token: string;
  expiresAt: string;
  user: AdminUser;
}

export const useAdminAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const { toast } = useToast();

  // Check for existing session on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    setIsLoading(true);
    
    const token = sessionStorage.getItem('admin_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-admin-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (error || !data?.valid) {
        // Token invalid or expired
        sessionStorage.removeItem('admin_token');
        setIsAuthenticated(false);
        setUser(null);
        
        if (data?.error === 'Token expired') {
          toast({
            title: "Sesión expirada",
            description: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
            variant: "destructive",
          });
        }
      } else {
        setIsAuthenticated(true);
        setUser(data.user);
        
        // Set up automatic logout before token expires
        if (data.expiresAt) {
          const expiresAt = new Date(data.expiresAt);
          const timeUntilExpiry = expiresAt.getTime() - Date.now();
          
          if (timeUntilExpiry > 0) {
            setTimeout(() => {
              logout();
              toast({
                title: "Sesión expirada",
                description: "Tu sesión ha expirado automáticamente.",
                variant: "destructive",
              });
            }, timeUntilExpiry);
          }
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      sessionStorage.removeItem('admin_token');
      setIsAuthenticated(false);
      setUser(null);
    }
    
    setIsLoading(false);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { email, password }
      });

      if (error || !data?.success) {
        const errorMessage = data?.error || 'Error al iniciar sesión';
        toast({
          title: "Error de autenticación",
          description: errorMessage,
          variant: "destructive",
        });
        return false;
      }

      // Store token securely in sessionStorage (more secure than localStorage)
      sessionStorage.setItem('admin_token', data.token);
      
      setIsAuthenticated(true);
      setUser(data.user);
      
      toast({
        title: "Sesión iniciada",
        description: `Bienvenido, ${data.user.name}`,
      });

      // Set up automatic logout before token expires
      const expiresAt = new Date(data.expiresAt);
      const timeUntilExpiry = expiresAt.getTime() - Date.now();
      
      setTimeout(() => {
        logout();
        toast({
          title: "Sesión expirada",
          description: "Tu sesión ha expirado automáticamente.",
          variant: "destructive",
        });
      }, timeUntilExpiry);

      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor. Intenta nuevamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setUser(null);
    
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente.",
    });
  };

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    checkAuthStatus,
    getAuthHeaders
  };
};