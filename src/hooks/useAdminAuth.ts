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
      // Quick cleanup
      AuthStorage.cleanupExpiredTokens();
      
      const adminAuth = AuthStorage.getAdminAuth();
      
      if (!adminAuth || (adminAuth.expiresAt && AuthStorage.isTokenExpired(adminAuth.expiresAt))) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Quick session validation without additional DB queries
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session || sessionData.session.access_token !== adminAuth.token) {
        logout();
        return;
      }

      setUser(adminAuth.user);
      setIsAuthenticated(true);

      // Set up auto-logout timer
      if (adminAuth.expiresAt) {
        const timeUntilExpiry = new Date(adminAuth.expiresAt).getTime() - Date.now();
        if (timeUntilExpiry > 0) {
          const autoLogoutTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 1000);
          setTimeout(() => {
            toast({
              title: "Sesión expirando",
              description: "Tu sesión expirará pronto.",
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
      console.log('Admin login attempt for:', email);
      
      // Single optimized query - check admin status BEFORE auth
      const { data: adminData, error: adminError } = await supabase
        .from('admin_accounts')
        .select('id, email, full_name, is_super_admin, active')
        .eq('email', email.trim().toLowerCase())
        .eq('active', true)
        .single();

      if (adminError || !adminData) {
        throw new Error('Access denied - not an admin user');
      }

      // Only authenticate if admin check passes
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (authError || !authData.user) {
        throw new Error('Invalid credentials');
      }

      // Update admin record with user_id (fire and forget)
      supabase
        .from('admin_accounts')
        .update({ 
          user_id: authData.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', adminData.id)
        .then(({ error }) => {
          if (error) {
            console.warn('Failed to update admin record:', error);
          } else {
            console.log('Admin record updated successfully');
          }
        });

      const userData = {
        id: authData.user.id,
        email: adminData.email,
        name: adminData.full_name || adminData.email,
        isAdmin: true,
        isSuperAdmin: adminData.is_super_admin || false
      };

      const authTokenData = {
        token: authData.session.access_token,
        user: userData,
        expiresAt: new Date(authData.session.expires_at * 1000).toISOString()
      };

      // Store auth data
      AuthStorage.setAdminAuth(authTokenData);
      setUser(userData);
      setIsAuthenticated(true);

      // Set up auto-logout timer (non-blocking)
      const expiryTime = new Date(authTokenData.expiresAt).getTime();
      const timeUntilExpiry = expiryTime - Date.now();
      
      if (timeUntilExpiry > 0) {
        const autoLogoutTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 1000);
        setTimeout(() => {
          toast({
            title: "Sesión expirando",
            description: "Tu sesión expirará pronto.",
            variant: "destructive"
          });
          logout();
        }, autoLogoutTime);
      }

      toast({
        title: "Acceso concedido",
        description: `Bienvenido, ${userData.name}`,
      });

      return true;

    } catch (error: any) {
      console.error('Login error:', error);
      
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
      } else {
        toast({
          title: "Error de conexión",
          description: "Intenta nuevamente.",
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