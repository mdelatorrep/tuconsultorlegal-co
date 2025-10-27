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
        // CAPA 1: Verificar user_type_registry primero (más rápido y confiable)
        const { data: registryData, error: registryError } = await supabase
          .from('user_type_registry')
          .select('user_type')
          .eq('user_id', supabaseUser.id)
          .single();

        if (registryData) {
          setUserType(registryData.user_type as UserType);
          setLoading(false);
          return;
        }

        // CAPA 2: Verificar metadata del usuario
        const isLawyerMeta = supabaseUser.user_metadata?.is_lawyer === true;

        if (isLawyerMeta) {
          // Verificar que efectivamente tiene perfil de abogado
          const { data: lawyerProfile, error: lawyerError } = await supabase
            .from('lawyer_profiles')
            .select('id')
            .eq('id', supabaseUser.id)
            .single();

          if (lawyerProfile) {
            setUserType('lawyer');
            setLoading(false);
            return;
          }
        }

        // CAPA 3: Verificar perfil de usuario regular
        const { data: userProfile, error: userError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', supabaseUser.id)
          .single();

        const detectedType = userProfile ? 'user' : 'guest';
        setUserType(detectedType);
      } catch (error) {
        console.error('[AUTH] Error detecting user type:', error);
        setUserType('guest'); // Default to guest si hay error
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