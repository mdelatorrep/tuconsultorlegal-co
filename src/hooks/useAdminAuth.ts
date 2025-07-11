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
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
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
      console.log('Attempting login with:', { email });
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { email, password }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.log('Edge function error:', error);
        
        // Handle specific HTTP status codes from edge function
        if (error.message?.includes('FunctionsHttpError')) {
          // Get more context from the network logs
          toast({
            title: "Error del servidor",
            description: "El servidor de autenticación devolvió un error. Revisa tu cuenta o contacta al administrador.",
            variant: "destructive",
          });
          throw new Error('Account temporarily locked or server error');
        }
        
        // Handle specific error cases
        if (error.message?.includes('Account temporarily locked')) {
          toast({
            title: "Cuenta bloqueada",
            description: "Cuenta temporalmente bloqueada debido a intentos fallidos. Usa el desbloqueo de emergencia.",
            variant: "destructive",
          });
          throw new Error('Account temporarily locked');
        }
        
        if (error.message?.includes('Too many attempts')) {
          toast({
            title: "Demasiados intentos",
            description: "Demasiados intentos de login. Espera unos minutos antes de intentar nuevamente.",
            variant: "destructive",
          });
          throw new Error('Too many attempts');
        }
        
        if (error.message?.includes('Invalid credentials')) {
          toast({
            title: "Credenciales inválidas", 
            description: "Email o contraseña incorrectos. Verifica tus datos.",
            variant: "destructive",
          });
          throw new Error('Invalid credentials');
        }
        
        // Generic error for network/connection issues
        toast({
          title: "Error de conectividad",
          description: "No se pudo establecer conexión con el servidor. Verifica tu conexión a internet.",
          variant: "destructive",
        });
        throw new Error('Connection error');
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Error al iniciar sesión';
        console.log('Login failed:', errorMessage);
        
        // Handle specific server errors based on actual response
        if (errorMessage.includes('Account temporarily locked')) {
          toast({
            title: "Cuenta bloqueada",
            description: "Tu cuenta está temporalmente bloqueada. Usa la función de desbloqueo de emergencia.",
            variant: "destructive",
          });
          throw new Error('Account temporarily locked');
        } else if (errorMessage.includes('Invalid credentials') || errorMessage.includes('Authentication failed')) {
          toast({
            title: "Credenciales incorrectas",
            description: "El email o contraseña no son correctos. Verifica e intenta nuevamente.",
            variant: "destructive",
          });
          throw new Error('Invalid credentials');
        } else if (errorMessage.includes('Account not found')) {
          toast({
            title: "Cuenta no encontrada",
            description: "No existe una cuenta de administrador con este email.",
            variant: "destructive",
          });
          throw new Error('Account not found');
        } else if (errorMessage.includes('Account inactive')) {
          toast({
            title: "Cuenta inactiva",
            description: "Tu cuenta de administrador está desactivada. Contacta al administrador del sistema.",
            variant: "destructive",
          });
          throw new Error('Account inactive');
        } else {
          toast({
            title: "Error de autenticación",
            description: errorMessage,
            variant: "destructive",
          });
          throw new Error(errorMessage);
        }
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
      
      // Re-throw handled errors to maintain specific error types
      if (error instanceof Error && 
          (error.message.includes('Account temporarily locked') || 
           error.message.includes('Invalid credentials') ||
           error.message.includes('Too many attempts') ||
           error.message.includes('Account not found') ||
           error.message.includes('Account inactive'))) {
        throw error;
      }
      
      // Handle unexpected errors
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error inesperado. Verifica tu conexión e intenta nuevamente.",
        variant: "destructive",
      });
      throw new Error('Unexpected error');
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