
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

  const signUpWithEmailAndPassword = async (email: string, password: string, fullName: string): Promise<{ success: boolean; requiresConfirmation: boolean }> => {
    try {
      console.log('=== LAWYER SIGNUP START ===');
      console.log('Attempting signup with:', { email, fullName });
      
      // Verify inputs
      if (!email || !password || !fullName) {
        console.error('Missing required fields:', { email: !!email, password: !!password, fullName: !!fullName });
        return { success: false, requiresConfirmation: false };
      }

      // VALIDAR TIPO DE USUARIO ANTES DE REGISTRAR
      console.log('=== VALIDATING USER TYPE ===');
      const { data: validationData, error: validationError } = await supabase.functions.invoke('validate-user-type', {
        body: {
          email: email.trim().toLowerCase(),
          requestedType: 'lawyer'
        }
      });

      if (validationError) {
        console.error('Validation error:', validationError);
        throw new Error('Error al validar el tipo de usuario');
      }

      if (!validationData.canRegister) {
        console.error('Cannot register:', validationData.error);
        throw new Error(validationData.error);
      }

      console.log('Validation passed, proceeding with signup');
      
      const redirectUrl = `${window.location.origin}/#abogados`;
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
        console.error('=== SIGNUP ERROR DETAILS ===');
        console.error('Status:', error.status);
        console.error('Message:', error.message);
        console.error('Code:', error.code || 'NO_CODE');
        console.error('Full error:', JSON.stringify(error, null, 2));
        
        // Handle specific error cases
        if (error.message?.includes('User already registered') || error.message?.includes('already registered')) {
          throw new Error('Este email ya está registrado. Intenta iniciar sesión en su lugar.');
        }
        
        // Handle 422 errors - This is almost always an SMTP/email sending issue
        if (error.status === 422) {
          console.error('=== 422 ERROR - SMTP/EMAIL ISSUE ===');
          console.error('This error occurs when Supabase cannot send the confirmation email.');
          console.error('Solutions: 1) Disable email confirmation in Supabase Auth settings');
          console.error('           2) Configure SMTP properly in Supabase Dashboard');
          throw new Error('No se pudo enviar el correo de confirmación. El administrador debe verificar la configuración de email en Supabase (Authentication → Providers → Email → deshabilitar "Confirm email" o configurar SMTP).');
        }
        
        // Handle password too short
        if (error.message?.includes('password') && error.message?.includes('short')) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }
        
        // Handle email rate limiting
        if (error.message?.includes('rate') || error.message?.includes('limit')) {
          throw new Error('Demasiados intentos. Por favor espera unos minutos antes de intentar nuevamente.');
        }
        
        // Generic error with more context
        throw new Error(error.message || 'Error al registrar la cuenta. Intenta nuevamente.');
      }

      if (!data.user) {
        console.error('No user returned from signup');
        return { success: false, requiresConfirmation: false };
      }

      const requiresConfirmation = !data.session;
      console.log('=== LAWYER SIGNUP SUCCESS ===');
      console.log('User created with ID:', data.user.id);
      console.log('Session present:', !!data.session, '- Email confirmation required:', requiresConfirmation);
      
      // Only send welcome email if email confirmation is NOT required (i.e., if there's a session)
      if (!requiresConfirmation) {
        setTimeout(async () => {
          try {
            const baseUrl = window.location.origin;
            const dashboardUrl = `${baseUrl}/#abogados`;
            const currentYear = new Date().getFullYear().toString();
            
            // Fetch template and prepare email
            const { data: template, error: templateError } = await supabase
              .from('email_templates')
              .select('*')
              .eq('template_key', 'lawyer_welcome')
              .eq('is_active', true)
              .single();
            
            if (templateError || !template) {
              console.error('Error fetching welcome email template:', templateError);
              return;
            }
            
            // Replace variables in template
            const variables: Record<string, string> = {
              lawyer_name: fullName,
              dashboard_url: dashboardUrl,
              current_year: currentYear,
              site_url: baseUrl
            };
            
            let subject = template.subject;
            let html = template.html_body;
            
            Object.entries(variables).forEach(([key, value]) => {
              const regex = new RegExp(`{{${key}}}`, 'g');
              subject = subject.replace(regex, value);
              html = html.replace(regex, value);
            });
            
            // Send email via send-email function
            await supabase.functions.invoke('send-email', {
              body: {
                to: email.trim().toLowerCase(),
                subject,
                html,
                template_key: 'lawyer_welcome',
                recipient_type: 'lawyer'
              }
            });
            
            console.log('Welcome email sent successfully');
          } catch (emailError) {
            console.error('Error sending welcome email:', emailError);
            // Don't block signup if email fails
          }
        }, 0);
      } else {
        console.log('Email confirmation required - welcome email will not be sent until user confirms');
      }
      
      return { success: true, requiresConfirmation };
    } catch (error) {
      console.error('=== SIGNUP CATCH ERROR ===');
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        name: error?.name || 'Unknown',
        stack: error?.stack || 'No stack trace'
      });
      return { success: false, requiresConfirmation: false };
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
