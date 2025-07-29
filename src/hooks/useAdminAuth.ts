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
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Flag to prevent logout loops
  const { toast } = useToast();

  const logout = async () => {
    if (isLoggingOut) {
      console.log('Logout already in progress, skipping');
      return;
    }
    
    setIsLoggingOut(true);
    console.log('Admin logout initiated');
    
    try {
      // Clear admin-specific session data using centralized storage
      AuthStorage.clearAdminAuth();
      setIsAuthenticated(false);
      setUser(null);
      
      // Only sign out from Supabase if there's actually a session
      // to avoid unnecessary auth state changes
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Signing out from Supabase session');
        await supabase.auth.signOut();
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Admin auth state change:', event);
        if ((event === 'SIGNED_OUT' || !session) && !isLoggingOut) {
          console.log('External sign out detected, triggering logout');
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
      console.log('=== ADMIN LOGIN START ===');
      console.log('Attempting admin login with:', { email });
      
      // Use native Supabase Auth for admin login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      console.log('Supabase auth response:', { authData, authError });

      if (authError || !authData.user) {
        console.error('Supabase auth failed:', authError);
        throw new Error('Invalid credentials');
      }

      // Verify admin status in admin_accounts table
      const { data: adminData, error: adminError } = await supabase
        .from('admin_accounts')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .eq('active', true)
        .single();

      if (adminError || !adminData) {
        // If user authenticated but is not in admin_accounts, sign them out
        await supabase.auth.signOut();
        throw new Error('Access denied - not an admin user');
      }

      // Store session token in admin_accounts for edge function verification
      const { error: updateError } = await supabase
        .from('admin_accounts')
        .update({ 
          user_id: authData.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', adminData.id);

      if (updateError) {
        console.error('Error updating admin account:', updateError);
      }

      const data = {
        success: true,
        token: authData.session.access_token,
        expiresAt: new Date(authData.session.expires_at * 1000).toISOString(),
        user: {
          id: authData.user.id,
          email: adminData.email,
          name: adminData.full_name || adminData.email,
          isAdmin: true,
          isSuperAdmin: adminData.is_super_admin || false
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
      } else if (error.message === 'Access denied - not an admin user') {
        toast({
          title: "Acceso denegado",
          description: "Tu cuenta no tiene permisos de administrador.",
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