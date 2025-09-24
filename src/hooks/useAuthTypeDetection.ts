import { useState, useEffect } from 'react';
import { useUserAuth } from '@/hooks/useUserAuth';
import { supabase } from '@/integrations/supabase/client';

export type UserType = 'guest' | 'user' | 'lawyer';

export interface AuthTypeDetection {
  userType: UserType;
  isAuthenticated: boolean;
  user: any;
  loading: boolean;
}

export const useAuthTypeDetection = (): AuthTypeDetection => {
  const [userType, setUserType] = useState<UserType>('guest');
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user: supabaseUser } = useUserAuth();

  useEffect(() => {
    const detectUserType = async () => {
      if (!isAuthenticated || !supabaseUser) {
        setUserType('guest');
        setLoading(false);
        return;
      }

      try {
        // Check if user is a lawyer
        const { data: lawyerProfile, error: lawyerError } = await supabase
          .from('lawyer_profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .single();

        if (lawyerProfile && !lawyerError) {
          setUserType('lawyer');
        } else {
          // Check if user has a regular profile
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', supabaseUser.id)
            .single();

          setUserType(userProfile ? 'user' : 'guest');
        }
      } catch (error) {
        console.error('Error detecting user type:', error);
        setUserType('user'); // Default to user if detection fails
      } finally {
        setLoading(false);
      }
    };

    detectUserType();
  }, [isAuthenticated, supabaseUser]);

  return {
    userType,
    isAuthenticated,
    user: supabaseUser,
    loading
  };
};