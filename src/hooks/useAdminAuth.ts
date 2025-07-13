import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AuthStorage } from '@/utils/authStorage';

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

  const logout = async () => {
    // Clear admin-specific session data using centralized storage
    AuthStorage.clearAdminAuth();
    setIsAuthenticated(false);
    setUser(null);
    
    // Also sign out from Supabase
    await supabase.auth.signOut();
  };

  useEffect(() => {
    checkAuthStatus();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Admin auth state change:', event);
        if (event === 'SIGNED_OUT' || !session) {
          logout();
        } else if (event === 'SIGNED_IN' && session) {
          // Update stored token if session changes
          const adminAuth = AuthStorage.getAdminAuth();
          if (adminAuth && adminAuth.token !== session.access_token) {
            AuthStorage.setAdminAuth({
              ...adminAuth,
              token: session.access_token,
              expiresAt: new Date(session.expires_at * 1000).toISOString()
            });
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Limpieza automática de tokens expirados
      AuthStorage.cleanupExpiredTokens();
      
      const adminAuth = AuthStorage.getAdminAuth();
      
      if (!adminAuth) {
        console.log('No admin auth data found');
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Check if token is expired
      if (adminAuth.expiresAt && AuthStorage.isTokenExpired(adminAuth.expiresAt)) {
        console.log('Admin token expired');
        logout();
        return;
      }

      // Verify token with Supabase session instead of edge function
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        console.log('Session validation failed or no session found:', sessionError);
        logout();
        return;
      }

      // Verify the stored token matches the current session
      if (sessionData.session.access_token !== adminAuth.token) {
        console.log('Token mismatch, clearing auth');
        logout();
        return;
      }

      setUser(adminAuth.user);
      setIsAuthenticated(true);

      // Set up auto-logout before expiry
      if (adminAuth.expiresAt) {
        const expiryTime = new Date(adminAuth.expiresAt).getTime();
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
      
      // Use native Supabase Auth for admin login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (authError || !authData.user) {
        throw new Error('Invalid credentials');
      }

      // Simulate admin verification (no admin_profiles table exists)
      // For now, any successful auth is considered admin access
      const data = {
        success: true,
        token: authData.session.access_token,
        expiresAt: new Date(authData.session.expires_at * 1000).toISOString(),
        user: {
          id: authData.user.id,
          email: authData.user.email || '',
          name: authData.user.email || 'Admin',
          isAdmin: true,
          isSuperAdmin: false
        }
      };

      console.log('Admin login successful:', data);

      // Store auth data using centralized storage
      AuthStorage.setAdminAuth({
        token: data.token,
        user: data.user,
        expiresAt: data.expiresAt
      });

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


  const getAuthHeaders = () => {
    const adminAuth = AuthStorage.getAdminAuth();
    return adminAuth ? { 'authorization': `Bearer ${adminAuth.token}` } : {};
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