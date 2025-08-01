import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'lawyer_onboarding_completed';

export const useLawyerOnboarding = (userId?: string) => {
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      checkOnboardingStatus(userId);
    } else {
      setIsLoading(false);
    }
  }, [userId]);

  const checkOnboardingStatus = (userId: string) => {
    try {
      // Check local storage only for now
      const localOnboarding = localStorage.getItem(`${ONBOARDING_KEY}_${userId}`);
      const isCompleted = localOnboarding === 'true';
      setShouldShowOnboarding(!isCompleted);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setShouldShowOnboarding(true); // Show onboarding by default if error
      setIsLoading(false);
    }
  };

  const markOnboardingCompleted = (userId: string) => {
    try {
      localStorage.setItem(`${ONBOARDING_KEY}_${userId}`, 'true');
      setShouldShowOnboarding(false);
    } catch (error) {
      console.error('Error marking onboarding completed:', error);
    }
  };

  const skipOnboarding = (userId: string) => {
    markOnboardingCompleted(userId);
  };

  const resetOnboarding = (userId: string) => {
    try {
      localStorage.removeItem(`${ONBOARDING_KEY}_${userId}`);
      setShouldShowOnboarding(true);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  return {
    shouldShowOnboarding,
    isLoading,
    markOnboardingCompleted,
    skipOnboarding,
    resetOnboarding
  };
};