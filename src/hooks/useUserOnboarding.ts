import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserAuth } from '@/hooks/useUserAuth';

interface OnboardingStatus {
  completed: boolean;
  loading: boolean;
  markAsCompleted: () => Promise<void>;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
}

const STORAGE_KEY = 'user_onboarding_completed';

export const useUserOnboarding = (): OnboardingStatus => {
  const { user } = useUserAuth();
  const [completed, setCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check database first
      const { data, error } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking onboarding status:', error);
        // Fallback to localStorage
        const localStatus = localStorage.getItem(STORAGE_KEY);
        setCompleted(localStatus === 'true');
      } else {
        setCompleted(data?.onboarding_completed || false);
        // Sync with localStorage
        localStorage.setItem(STORAGE_KEY, String(data?.onboarding_completed || false));
      }
    } catch (error) {
      console.error('Error in checkOnboardingStatus:', error);
      // Fallback to localStorage
      const localStatus = localStorage.getItem(STORAGE_KEY);
      setCompleted(localStatus === 'true');
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('update-user-onboarding', {
        body: { userId: user.id }
      });

      if (error) {
        console.error('Error marking onboarding as completed:', error);
        // Fallback to localStorage
        localStorage.setItem(STORAGE_KEY, 'true');
        setCompleted(true);
      } else {
        localStorage.setItem(STORAGE_KEY, 'true');
        setCompleted(true);
      }
    } catch (error) {
      console.error('Error in markAsCompleted:', error);
      // Fallback to localStorage
      localStorage.setItem(STORAGE_KEY, 'true');
      setCompleted(true);
    }
  };

  const skipOnboarding = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setCompleted(true);
  };

  const resetOnboarding = () => {
    localStorage.setItem(STORAGE_KEY, 'false');
    setCompleted(false);
  };

  return {
    completed,
    loading,
    markAsCompleted,
    skipOnboarding,
    resetOnboarding
  };
};
