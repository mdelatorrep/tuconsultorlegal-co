import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  is_super_admin: boolean;
  active: boolean;
}

interface AdminUser extends User {
  profile?: AdminProfile;
}

export const useSecureAdminAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Check if user has admin profile
          const adminProfile = await loadAdminProfile(session.user);
          if (adminProfile) {
            setUser({ ...session.user, profile: adminProfile });
            setIsAuthenticated(true);
          } else {
            setUser(null);
            setIsAuthenticated(false);
            // Log unauthorized access attempt
            await supabase.functions.invoke('log-security-event', {
              body: {
                event_type: 'unauthorized_admin_attempt',
                user_identifier: session.user.email,
                details: { user_id: session.user.id }
              }
            });
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
        
        setIsLoading(false);
      }
    );

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadAdminProfile(session.user).then((adminProfile) => {
          if (adminProfile) {
            setUser({ ...session.user, profile: adminProfile });
            setIsAuthenticated(true);
          }
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadAdminProfile = async (authUser: User): Promise<AdminProfile | null> => {
    try {
      const { data: adminProfile, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('active', true)
        .maybeSingle();

      if (error) {
        console.error('Error loading admin profile:', error);
        return null;
      }

      return adminProfile;
    } catch (error) {
      console.error('Error in loadAdminProfile:', error);
      return null;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        console.error('Admin login error:', error);
        
        // Log failed login attempt
        await supabase.functions.invoke('log-security-event', {
          body: {
            event_type: 'admin_login_failed',
            user_identifier: email,
            details: { error: error.message }
          }
        });

        toast({
          title: "Error de autenticación",
          description: "Credenciales inválidas. Verifica tu email y contraseña.",
          variant: "destructive",
        });
        
        return false;
      }

      if (data.user) {
        // Verify admin profile exists
        const adminProfile = await loadAdminProfile(data.user);
        
        if (!adminProfile) {
          // User exists but is not an admin
          await supabase.auth.signOut();
          
          toast({
            title: "Acceso denegado",
            description: "No tienes permisos de administrador.",
            variant: "destructive",
          });
          
          return false;
        }

        // Log successful login
        await supabase.functions.invoke('log-security-event', {
          body: {
            event_type: 'admin_login_success',
            user_identifier: email,
            details: { 
              user_id: data.user.id,
              admin_id: adminProfile.id,
              is_super_admin: adminProfile.is_super_admin
            }
          }
        });

        toast({
          title: "Bienvenido",
          description: `Hola ${adminProfile.full_name}, has iniciado sesión correctamente.`,
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      
      toast({
        title: "Error",
        description: "Ocurrió un error durante el inicio de sesión. Intenta nuevamente.",
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Log logout event
      if (user?.email) {
        await supabase.functions.invoke('log-security-event', {
          body: {
            event_type: 'admin_logout',
            user_identifier: user.email,
            details: { user_id: user.id }
          }
        });
      }

      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente.",
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const checkAuthStatus = async (): Promise<void> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const adminProfile = await loadAdminProfile(session.user);
        if (adminProfile) {
          setUser({ ...session.user, profile: adminProfile });
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          await supabase.auth.signOut();
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth status check error:', error);
      setIsAuthenticated(false);
    }
  };

  const getAuthHeaders = (): Record<string, string> => {
    if (session?.access_token) {
      return {
        'Authorization': `Bearer ${session.access_token}`
      };
    }
    return {};
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    session,
    login,
    logout,
    checkAuthStatus,
    getAuthHeaders
  };
};