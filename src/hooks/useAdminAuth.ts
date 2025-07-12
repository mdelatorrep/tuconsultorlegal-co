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
  error?: string;
}

export const useAdminAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = sessionStorage.getItem('admin_token');
      const userData = sessionStorage.getItem('admin_user');
      const expiresAt = sessionStorage.getItem('admin_expires_at');

      console.log('User NOT authenticated');
      
      if (!token || !userData || !expiresAt) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Check if token is expired
      if (new Date(expiresAt) <= new Date()) {
        console.log('Admin token expired');
        logout();
        return;
      }

      // Verify token with server using the new validation function
      const { data, error } = await supabase.rpc('validate_admin_session', {
        session_token: token
      });

      if (error || !data?.[0]?.valid) {
        console.log('Admin token validation failed:', error);
        logout();
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setIsAuthenticated(true);

      // Set up auto-logout before expiry
      const expiryTime = new Date(expiresAt).getTime();
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;
      
      if (timeUntilExpiry > 0) {
        const autoLogoutTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 1000);
        setTimeout(() => {
          console.log('Auto-logout triggered for admin');
          toast({
            title: "Sesión expirando",
            description: "Tu sesión de administrador expirará pronto.",
            variant: "destructive"
          });
          logout();
        }, autoLogoutTime);
      }

    } catch (error) {
      console.error('Error checking admin auth status:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('Attempting admin login with:', { email });
      
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { 
          email: email.trim(),
          password: password.trim()
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Admin login edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error('Connection error');
      }

      if (!data?.success) {
        console.log('Login failed - response:', data);
        throw new Error(data?.error || 'Login failed');
      }

      // Store auth data in admin-specific keys
      sessionStorage.setItem('admin_token', data.token);
      sessionStorage.setItem('admin_user', JSON.stringify(data.user));
      sessionStorage.setItem('admin_expires_at', data.expiresAt);

      setUser(data.user);
      setIsAuthenticated(true);

      // Set up auto-logout before expiry
      const expiryTime = new Date(data.expiresAt).getTime();
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;
      
      if (timeUntilExpiry > 0) {
        const autoLogoutTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 1000);
        setTimeout(() => {
          console.log('Auto-logout triggered');
          toast({
            title: "Sesión expirando",
            description: "Tu sesión expirará pronto. Por favor, vuelve a iniciar sesión.",
            variant: "destructive"
          });
          logout();
        }, autoLogoutTime);
      }

      console.log('Admin login successful:', data.user);
      toast({
        title: "Acceso concedido",
        description: `Bienvenido, ${data.user.name}`,
      });

      return true;

    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific error types with user-friendly messages
      if (error.message === 'Invalid credentials') {
        toast({
          title: "Credenciales inválidas",
          description: "Email o contraseña incorrectos.",
          variant: "destructive"
        });
      } else if (error.message === 'Account temporarily locked') {
        toast({
          title: "Cuenta bloqueada",
          description: "Tu cuenta está temporalmente bloqueada debido a múltiples intentos fallidos.",
          variant: "destructive"
        });
      } else if (error.message === 'Connection error') {
        toast({
          title: "Error de conexión",
          description: "No se pudo conectar con el servidor. Intenta nuevamente.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error inesperado",
          description: "Ocurrió un error inesperado. Intenta nuevamente.",
          variant: "destructive"
        });
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear admin-specific session data only
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_expires_at');
    setIsAuthenticated(false);
    setUser(null);
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