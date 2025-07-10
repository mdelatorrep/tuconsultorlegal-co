import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      const token = sessionStorage.getItem('lawyer_token');
      const userData = sessionStorage.getItem('lawyer_user');

      if (!token || !userData) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Verify token with server
      const { data, error } = await supabase.functions.invoke('verify-lawyer-token', {
        body: { token },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error || !data?.valid) {
        console.log('Lawyer token verification failed:', error);
        logout();
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
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
        sessionStorage.setItem('lawyer_token', token);
        sessionStorage.setItem('lawyer_user', JSON.stringify(data.user));
        
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
    sessionStorage.removeItem('lawyer_token');
    sessionStorage.removeItem('lawyer_user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('lawyer_token');
    return token ? { 'authorization': token } : {};
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    loginWithToken,
    logout,
    checkAuthStatus,
    getAuthHeaders
  };
};