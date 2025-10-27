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
        console.log('[AUTH DETECTION] Not authenticated, setting to guest');
        setUserType('guest');
        setLoading(false);
        return;
      }

      console.log('[AUTH DETECTION] Starting detection for user:', supabaseUser.email);

      try {
        // CAPA 1: Verificar user_type_registry primero (más rápido y confiable)
        const { data: registryData, error: registryError } = await supabase
          .from('user_type_registry')
          .select('user_type')
          .eq('user_id', supabaseUser.id)
          .single();

        console.log('[AUTH DETECTION] Registry check:', { registryData, registryError });

        if (registryData) {
          console.log('[AUTH DETECTION] ✅ Found in registry:', registryData.user_type);
          setUserType(registryData.user_type as UserType);
          setLoading(false);
          return;
        }

        // CAPA 2: Verificar metadata del usuario
        const isLawyerMeta = supabaseUser.user_metadata?.is_lawyer === true;
        console.log('[AUTH DETECTION] Metadata check - is_lawyer:', isLawyerMeta);

        if (isLawyerMeta) {
          // Verificar que efectivamente tiene perfil de abogado
          const { data: lawyerProfile, error: lawyerError } = await supabase
            .from('lawyer_profiles')
            .select('id')
            .eq('id', supabaseUser.id)
            .single();

          console.log('[AUTH DETECTION] Lawyer profile check:', { lawyerProfile, lawyerError });

          if (lawyerProfile) {
            console.log('[AUTH DETECTION] ✅ Confirmed lawyer profile');
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

        console.log('[AUTH DETECTION] User profile check:', { userProfile, userError });

        const detectedType = userProfile ? 'user' : 'guest';
        console.log('[AUTH DETECTION] ✅ Final detected type:', detectedType);
        setUserType(detectedType);
      } catch (error) {
        console.error('[AUTH DETECTION] ❌ Error detecting user type:', error);
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