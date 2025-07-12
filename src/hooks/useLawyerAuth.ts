import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthStorage } from '@/utils/authStorage';

interface LawyerUser {
  id: string;
  email: string;
  name: string;
  canCreateAgents: boolean;
}

export const useLawyerAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<LawyerUser | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Limpieza automática de tokens expirados
      AuthStorage.cleanupExpiredTokens();
      
      const lawyerAuth = AuthStorage.getLawyerAuth();

      if (!lawyerAuth) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Verify token with server
      const { data, error } = await supabase.functions.invoke('verify-lawyer-token', {
        body: { token: lawyerAuth.token },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error || !data?.valid) {
        console.log('Lawyer token verification failed:', error);
        logout();
        return;
      }

      setUser(lawyerAuth.user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error checking lawyer auth status:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithToken = async (token: string): Promise<boolean> => {
    try {
      console.log('Attempting lawyer login with token');
      
      const { data, error } = await supabase.functions.invoke('lawyer-login', {
        body: { token },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        console.error('Lawyer login error:', error);
        return false;
      }

      if (data.success && data.user) {
        AuthStorage.setLawyerAuth({
          token: token,
          user: data.user
        });
        
        setUser(data.user);
        setIsAuthenticated(true);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Lawyer login exception:', error);
      return false;
    }
  };

  const loginWithEmailAndToken = async (email: string, token: string): Promise<boolean> => {
    try {
      console.log('Attempting lawyer login with email and token');
      
      const { data, error } = await supabase.functions.invoke('lawyer-login', {
        body: { email, token },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        console.error('Lawyer login error:', error);
        return false;
      }

      if (data.success && data.user) {
        AuthStorage.setLawyerAuth({
          token: token,
          user: data.user
        });
        
        setUser(data.user);
        setIsAuthenticated(true);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Lawyer login exception:', error);
      return false;
    }
  };

  const logout = () => {
    AuthStorage.clearLawyerAuth();
    setIsAuthenticated(false);
    setUser(null);
  };

  const getAuthHeaders = () => {
    const lawyerAuth = AuthStorage.getLawyerAuth();
    return lawyerAuth ? { 'authorization': lawyerAuth.token } : {};
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    loginWithToken,
    loginWithEmailAndToken,
    logout,
    checkAuthStatus,
    getAuthHeaders
  };
};