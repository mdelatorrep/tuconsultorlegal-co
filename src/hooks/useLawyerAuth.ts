
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
    // Set up auth state listener FIRST (sync callback to avoid deadlocks)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        timestamp: new Date().toISOString()
      });

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setSession(session);
        // Defer any Supabase calls to avoid blocking the callback
        // Validate subscription ONLY on sign in
        setTimeout(() => {
          fetchLawyerProfile(session.user, true);
        }, 0);
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSession(session);
      }
    });

    // THEN check for existing session
    checkAuthStatus();

    return () => subscription.unsubscribe();
  }, []);

  const fetchLawyerProfile = async (authUser: User, validateSub: boolean = false) => {
    try {
      // Only validate subscription when explicitly requested
      if (validateSub) {
        await validateSubscriptionStatus(authUser);
      }
      
      const { data: profile, error } = await supabase
        .from('lawyer_profiles')
        .select('id, email, full_name, can_create_agents, can_create_blogs, can_use_ai_tools')
        .eq('id', authUser.id)
        .single();

      if (error || !profile) {
        console.error('Error fetching lawyer profile:', error);
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
        canUseAiTools: profile.can_use_ai_tools
      };

      setUser(lawyerUser);
      setIsAuthenticated(true);

      // Identify user in LogRocket (non-blocking)
      setTimeout(() => {
        identifyUser({
          id: lawyerUser.id,
          name: lawyerUser.name,
          email: lawyerUser.email,
          role: 'lawyer',
          subscriptionType: lawyerUser.canUseAiTools ? 'lawyer_premium' : 'lawyer_basic'
        });
      }, 0);
    } catch (error) {
      console.error('Error fetching lawyer profile:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const validateSubscriptionStatus = async (authUser: User) => {
    try {
      console.log('Validating subscription status for user:', authUser.id);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('validate-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error validating subscription:', error);
        return;
      }

      console.log('Subscription validation result:', data);
    } catch (error) {
      console.error('Error in subscription validation:', error);
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (error) {
        console.error('Supabase auth error:', error);
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

  const signUpWithEmailAndPassword = async (email: string, password: string, fullName: string): Promise<{ success: boolean; requiresConfirmation: boolean; error?: string }> => {
    try {
      console.log('=== LAWYER SIGNUP START ===');
      console.log('Attempting signup with:', { email, fullName });
      
      // Verify inputs
      if (!email || !password || !fullName) {
        console.error('Missing required fields:', { email: !!email, password: !!password, fullName: !!fullName });
        return { success: false, requiresConfirmation: false, error: 'Faltan campos requeridos' };
      }

      // Use the new edge function that bypasses email confirmation issues
      console.log('=== CALLING CREATE-LAWYER-ACCOUNT FUNCTION ===');
      const { data, error: invokeError } = await supabase.functions.invoke('create-lawyer-account', {
        body: {
          email: email.trim().toLowerCase(),
          password: password,
          fullName: fullName
        }
      });

      console.log('Create lawyer account response:', { data, invokeError });

      if (invokeError) {
        console.error('Edge function error:', invokeError);
        // Try to parse error message
        let errorMessage = 'Error al crear la cuenta';
        try {
          if (invokeError.message) {
            const match = invokeError.message.match(/\{.*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              errorMessage = parsed.error || errorMessage;
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
        return { success: false, requiresConfirmation: false, error: errorMessage };
      }

      if (!data?.success) {
        console.error('Registration failed:', data?.error);
        return { success: false, requiresConfirmation: false, error: data?.error || 'Error al crear la cuenta' };
      }

      console.log('=== LAWYER ACCOUNT CREATED ===');
      console.log('User ID:', data.user?.id);

      // Now sign in the user to get a session
      console.log('Signing in the new user...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (signInError) {
        console.error('Sign in error after registration:', signInError);
        // Account was created but couldn't sign in - still success, ask user to login
        return { success: true, requiresConfirmation: false, error: 'Cuenta creada. Por favor inicia sesión.' };
      }

      if (signInData.user) {
        await fetchLawyerProfile(signInData.user);
      }

      console.log('=== LAWYER SIGNUP SUCCESS ===');
      return { success: true, requiresConfirmation: false };
    } catch (error: any) {
      console.error('=== SIGNUP CATCH ERROR ===');
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        name: error?.name || 'Unknown',
        stack: error?.stack || 'No stack trace'
      });
      return { success: false, requiresConfirmation: false, error: error?.message || 'Error de conexión. Intenta nuevamente.' };
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      const redirectUrl = `${window.location.origin}/#abogados`;
      
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

  const updateEmail = async (newEmail: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) {
        console.error('Update email error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Update email error:', error);
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
    console.log('=== LAWYER LOGOUT FUNCTION STARTED ===');
    try {
      // Try to sign out (non-blocking cleanup in finally)
      await supabase.auth.signOut();
      console.log('Supabase signOut completed');
    } catch (error) {
      console.warn('Supabase signOut error (continuing with local cleanup):', error);
    } finally {
      // Local cleanup regardless of signOut result
      setIsAuthenticated(false);
      setUser(null);
      setSession(null);
      AuthStorage.clearLawyerAuth();
      // Navigate to home hash route to ensure proper landing
      window.location.replace('/#home');
    }
  };

  const getAuthHeaders = () => {
    return session?.access_token ? { 'authorization': `Bearer ${session.access_token}` } : {};
  };

  const refreshUserPermissions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchLawyerProfile(session.user);
    }
  };

  const validateAndRefreshSubscription = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await validateSubscriptionStatus(session.user);
      await fetchLawyerProfile(session.user);
    }
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
    updateEmail,
    logout,
    checkAuthStatus,
    getAuthHeaders,
    refreshUserPermissions,
    validateAndRefreshSubscription
  };
};
