
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
  tokenId: string; // ID from lawyer_tokens table
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
      const { data: profile, error } = await supabase
        .from('lawyer_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error || !profile) {
        console.error('Error fetching lawyer profile:', error);
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      // Also fetch the lawyer token to get the tokenId
      const { data: lawyerToken, error: tokenError } = await supabase
        .from('lawyer_tokens')
        .select('id, access_token')
        .eq('lawyer_id', authUser.id)
        .eq('active', true)
        .single();

      if (tokenError || !lawyerToken) {
        console.error('Error fetching lawyer token:', tokenError);
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      const lawyerUser: LawyerUser = {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        canCreateAgents: profile.can_create_agents,
        canCreateBlogs: profile.can_create_blogs,
        tokenId: lawyerToken.id // Add the tokenId from lawyer_tokens table
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
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      if (data.user) {
        await fetchLawyerProfile(data.user);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const signUpWithEmailAndPassword = async (email: string, password: string, fullName: string): Promise<boolean> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            is_lawyer: true,
            can_create_agents: false,
            can_create_blogs: false
          }
        }
      });

      if (error) {
        console.error('SignUp error:', error);
        return false;
      }

      return !!data.user;
    } catch (error) {
      console.error('SignUp error:', error);
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
      console.log('Logging out lawyer');
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUser(null);
      setSession(null);
      // Force navigation to home page after logout
      window.location.href = '/';
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
    loginWithEmailAndPassword,
    signUpWithEmailAndPassword,
    resetPassword,
    updatePassword,
    logout,
    checkAuthStatus,
    getAuthHeaders
  };
};
