import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLogRocket } from '@/hooks/useLogRocket';
import type { User, Session } from '@supabase/supabase-js';

interface AdminProfile {
  id: string;
  user_id: string;
  full_name: string;
  is_super_admin: boolean;
  active: boolean;
}

interface AdminUser extends User {
  profile?: AdminProfile;
}

export const useNativeAdminAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const { toast } = useToast();
  const { identifyUser } = useLogRocket();

  useEffect(() => {
    checkAuthStatus();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Admin auth state change:', event, session?.user?.email);
        setSession(session);
        
        if (session?.user) {
          await loadAdminProfile(session.user);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await loadAdminProfile(session.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdminProfile = async (authUser: User) => {
    try {
      console.log('Loading admin profile for user:', authUser.id);
      console.log('Auth user details:', { id: authUser.id, email: authUser.email });
      
      // Simulate admin profile loading (no admin_profiles table exists)
      // For now, any authenticated user is considered admin
      console.log('Simulating admin profile for user:', authUser.id);
      
      const mockProfile = {
        id: authUser.id,
        user_id: authUser.id,
        full_name: authUser.email || 'Admin',
        is_super_admin: false,
        active: true
      };

      console.log('Mock admin profile loaded:', mockProfile);
      const adminUser: AdminUser = {
        ...authUser,
        profile: mockProfile
      };

      setUser(adminUser);
      setIsAuthenticated(true);
      
      // Identify user in LogRocket
      identifyUser({
        id: adminUser.id,
        name: adminUser.profile?.full_name || adminUser.email || 'Admin User',
        email: adminUser.email || '',
        role: adminUser.profile?.is_super_admin ? 'super_admin' : 'admin',
        subscriptionType: 'admin_access'
      });
      
      console.log('Admin authentication state updated: authenticated =', true);
    } catch (error) {
      console.error('Error in loadAdminProfile:', error);
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('Attempting admin login with Supabase Auth:', { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        console.error('Login error:', error);
        
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Credenciales inválidas",
            description: "Email o contraseña incorrectos.",
            variant: "destructive"
          });
        } else if (error.message.includes('Email not confirmed')) {
          toast({
            title: "Email no confirmado",
            description: "Por favor confirma tu email antes de iniciar sesión.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error de autenticación",
            description: error.message,
            variant: "destructive"
          });
        }
        return false;
      }

      if (data.user) {
        await loadAdminProfile(data.user);
        
        toast({
          title: "Sesión iniciada",
          description: `Bienvenido, ${data.user.email}`,
        });
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Login exception:', error);
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error inesperado. Intenta nuevamente.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUser(null);
      setSession(null);
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente.",
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getAuthHeaders = () => {
    return session?.access_token ? { 'authorization': `Bearer ${session.access_token}` } : {};
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