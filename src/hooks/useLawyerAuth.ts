
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthStorage } from '@/utils/authStorage';
import { useLogRocket } from '@/hooks/useLogRocket';

interface LawyerUser {
  id: string;
  email: string;
  name: string;
  canCreateAgents: boolean;
  canCreateBlogs: boolean;
}

export const useLawyerAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<LawyerUser | null>(null);
  const { identifyUser } = useLogRocket();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking lawyer auth status');
      AuthStorage.cleanupExpiredTokens();
      
      const lawyerAuth = AuthStorage.getLawyerAuth();

      if (!lawyerAuth) {
        console.log('No lawyer auth found in storage');
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      console.log('Found lawyer auth in storage');
      setUser(lawyerAuth.user);
      setIsAuthenticated(true);
      
      // Identify user in LogRocket
      identifyUser({
        id: lawyerAuth.user.id,
        name: lawyerAuth.user.name,
        email: lawyerAuth.user.email,
        role: 'lawyer',
        subscriptionType: lawyerAuth.user.canCreateAgents ? 'lawyer_premium' : 'lawyer_basic'
      });
    } catch (error) {
      console.error('Error checking lawyer auth status:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmailAndToken = async (email: string, token: string): Promise<boolean> => {
    try {
      console.log('=== FRONTEND LOGIN START ===');
      console.log('Email:', email, 'Token:', token);
      
      const { data, error } = await supabase.functions.invoke('lawyer-login', {
        body: { email: email.trim().toLowerCase(), token: token.trim() }
      });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        return false;
      }

      if (data && data.success && data.user) {
        console.log('Login successful! User data:', data.user);
        console.log('User permissions - canCreateAgents:', data.user.canCreateAgents);
        console.log('User permissions - canCreateBlogs:', data.user.canCreateBlogs);
        
        AuthStorage.setLawyerAuth({
          token: token.trim(),
          user: data.user
        });
        
        setUser(data.user);
        setIsAuthenticated(true);
        
        // Identify user in LogRocket
        identifyUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: 'lawyer',
          subscriptionType: data.user.canCreateAgents ? 'lawyer_premium' : 'lawyer_basic'
        });
        
        // Forzar una verificación del estado para asegurar consistencia
        setTimeout(() => {
          checkAuthStatus();
        }, 200);
        
        return true;
      }
      
      console.log('Login failed. Response:', data);
      return false;
      
    } catch (error) {
      console.error('Frontend login error:', error);
      return false;
    }
  };

  const logout = () => {
    console.log('Logging out lawyer');
    AuthStorage.clearLawyerAuth();
    setIsAuthenticated(false);
    setUser(null);
    // Force navigation to home page after logout
    window.location.href = '/';
  };

  const getAuthHeaders = () => {
    const lawyerAuth = AuthStorage.getLawyerAuth();
    return lawyerAuth ? { 'authorization': lawyerAuth.token } : {};
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    loginWithEmailAndToken,
    logout,
    checkAuthStatus,
    getAuthHeaders
  };
};
