import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
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
    const userStr = sessionStorage.getItem('admin_user');
    const expires = sessionStorage.getItem('admin_expires');
    
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Check if we have cached user data and token hasn't expired
    if (userStr && expires) {
      const expiresAt = new Date(expires);
      const now = new Date();
      
      if (expiresAt > now) {
        // Token still valid, use cached data
        const userData = JSON.parse(userStr);
        setIsAuthenticated(true);
        setUser(userData);
        setIsLoading(false);
        return;
      }
    }

    // Verify token with server
    try {
      const { data, error } = await supabase.functions.invoke('verify-admin-token', {
        body: { token },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error || !data?.valid) {
        // Token invalid or expired
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_user');
        sessionStorage.removeItem('admin_expires');
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
        
        // Update cached data
        sessionStorage.setItem('admin_user', JSON.stringify(data.user));
        if (data.expiresAt) {
          sessionStorage.setItem('admin_expires', data.expiresAt);
        }
        
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
      sessionStorage.removeItem('admin_user');
      sessionStorage.removeItem('admin_expires');
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
      sessionStorage.setItem('admin_user', JSON.stringify(data.user));
      sessionStorage.setItem('admin_expires', data.expiresAt);
      
      console.log('Login successful - setting authentication state');
      
      // Force immediate state update
      setIsAuthenticated(true);
      setUser(data.user);
      setIsLoading(false);
      
      toast({
        title: "Sesión iniciada",
        description: `Bienvenido, ${data.user.name}`,
      });

      // Set up automatic logout before token expires
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
    sessionStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_expires');
    setIsAuthenticated(false);
    setUser(null);
    
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente.",
    });
  };

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('admin_token');
    return token ? { 'authorization': token } : {};
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