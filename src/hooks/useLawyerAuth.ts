
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthStorage } from '@/utils/authStorage';
import { useLogRocket } from '@/hooks/useLogRocket';
import { User, Session } from '@supabase/supabase-js';

interface LawyerUser {
  id: string;
  email: string;
  name: string;
  canCreateAgents: boolean;
  canCreateBlogs: boolean;
  canUseAiTools: boolean;
}

export const useLawyerAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<LawyerUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const { identifyUser } = useLogRocket();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session);
        setSession(session);
        
        if (session?.user) {
          await fetchLawyerProfile(session.user);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    checkAuthStatus();

    return () => subscription.unsubscribe();
  }, []);

  const fetchLawyerProfile = async (authUser: User) => {
    try {
      console.log('=== FETCHING LAWYER PROFILE ===');
      console.log('Fetching lawyer profile for user:', authUser.id, authUser.email);
      
      const { data: profile, error } = await supabase
        .from('lawyer_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      console.log('Profile query result:', { profile, error });

      if (error || !profile) {
        console.error('Error fetching lawyer profile:', error);
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      console.log('Lawyer profile found:', profile.full_name);

      const lawyerUser: LawyerUser = {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        canCreateAgents: profile.can_create_agents,
        canCreateBlogs: profile.can_create_blogs,
        canUseAiTools: profile.can_use_ai_tools
      };

      setUser(lawyerUser);
      setIsAuthenticated(true);

      // Identify user in LogRocket
      identifyUser({
        id: lawyerUser.id,
        name: lawyerUser.name,
        email: lawyerUser.email,
        role: 'lawyer',
        subscriptionType: lawyerUser.canCreateAgents ? 'lawyer_premium' : 'lawyer_basic'
      });
    } catch (error) {
      console.error('Error fetching lawyer profile:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user) {
        await fetchLawyerProfile(session.user);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmailAndPassword = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('=== LAWYER LOGIN START ===');
      console.log('Attempting login with email:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      console.log('Supabase auth response:', { data, error });

      if (error) {
        console.error('Supabase auth error:', error);
        return false;
      }

      if (data.user) {
        console.log('User authenticated, fetching profile...');
        await fetchLawyerProfile(data.user);
        console.log('=== LAWYER LOGIN SUCCESS ===');
        return true;
      }
      
      console.log('=== LAWYER LOGIN FAILED - NO USER ===');
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const signUpWithEmailAndPassword = async (email: string, password: string, fullName: string): Promise<boolean> => {
    try {
      console.log('=== LAWYER SIGNUP START ===');
      console.log('Attempting signup with:', { email, fullName });
      
      // Verify inputs
      if (!email || !password || !fullName) {
        console.error('Missing required fields:', { email: !!email, password: !!password, fullName: !!fullName });
        return false;
      }
      
      const redirectUrl = `${window.location.origin}/`;
      console.log('Redirect URL:', redirectUrl);
      
      console.log('Calling supabase.auth.signUp...');
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            is_lawyer: true,
            can_create_agents: false,
            can_create_blogs: false,
            can_use_ai_tools: false
          }
        }
      });

      console.log('Supabase signup response:', { 
        user: data?.user ? 'User created' : 'No user', 
        session: data?.session ? 'Session created' : 'No session',
        error: error ? error.message : 'No error'
      });

      if (error) {
        console.error('SignUp error details:', {
          message: error.message,
          status: error.status,
          code: error.code || 'NO_CODE'
        });
        
        // Handle specific error cases
        if (error.message?.includes('User already registered') || error.message?.includes('already registered')) {
          throw new Error('Este email ya está registrado. Intenta iniciar sesión en su lugar.');
        }
        
        return false;
      }

      if (!data.user) {
        console.error('No user returned from signup');
        return false;
      }

      console.log('=== LAWYER SIGNUP SUCCESS ===');
      console.log('User created with ID:', data.user.id);
      return true;
    } catch (error) {
      console.error('=== SIGNUP CATCH ERROR ===');
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        name: error?.name || 'Unknown',
        stack: error?.stack || 'No stack trace'
      });
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      const redirectUrl = `${window.location.origin}/auth/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      if (error) {
        console.error('Reset password error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Reset password error:', error);
      return false;
    }
  };

  const updatePassword = async (newPassword: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Update password error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Update password error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log('=== LAWYER LOGOUT FUNCTION STARTED ===');
      console.log('Current user:', user);
      console.log('Current session:', session);
      console.log('Current isAuthenticated:', isAuthenticated);
      
      // Check if there's an active session before attempting signOut
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      console.log('Current session found:', !!currentSession);
      
      if (currentSession) {
        console.log('Calling supabase.auth.signOut...');
        await supabase.auth.signOut();
        console.log('Supabase signOut completed');
      } else {
        console.log('No active session found, proceeding with local cleanup');
      }
      
      // Always clear local state regardless of signOut result
      console.log('Clearing local auth state...');
      setIsAuthenticated(false);
      setUser(null);
      setSession(null);
      
      // Clear any stored auth data
      console.log('Clearing AuthStorage...');
      AuthStorage.clearLawyerAuth();
      
      // Force navigation to home page after logout
      console.log('Navigating to home page...');
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      setIsAuthenticated(false);
      setUser(null);
      setSession(null);
      window.location.href = '/';
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
    loginWithEmailAndPassword,
    signUpWithEmailAndPassword,
    resetPassword,
    updatePassword,
    logout,
    checkAuthStatus,
    getAuthHeaders
  };
};
