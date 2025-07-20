import { useEffect } from 'react';
import { useLogRocket } from '@/hooks/useLogRocket';

// Hook to track regular users (non-authenticated visitors)
export const useUserTracking = () => {
  const { identifyUser, trackEvent } = useLogRocket();

  const trackAnonymousUser = (sessionData?: Record<string, any>) => {
    // Generate a unique session ID for anonymous users
    const sessionId = sessionStorage.getItem('anonymous-session-id') || 
      `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!sessionStorage.getItem('anonymous-session-id')) {
      sessionStorage.setItem('anonymous-session-id', sessionId);
    }

    identifyUser({
      id: sessionId,
      name: 'Usuario Anónimo',
      email: '',
      role: 'visitor',
      subscriptionType: 'free',
      ...sessionData
    });
  };

  const trackUserAction = (action: string, properties?: Record<string, any>) => {
    trackEvent(`user_action_${action}`, {
      ...properties,
      userType: 'visitor',
      source: 'tuconsultorlegal'
    });
  };

  const trackPageVisit = (page: string, metadata?: Record<string, any>) => {
    trackEvent('page_visit', {
      page,
      ...metadata,
      userType: 'visitor',
      timestamp: new Date().toISOString()
    });
  };

  const trackDocumentInteraction = (documentType: string, action: 'view' | 'start' | 'complete', metadata?: Record<string, any>) => {
    trackEvent('document_interaction', {
      documentType,
      action,
      ...metadata,
      userType: 'visitor'
    });
  };

  const trackConsultationInteraction = (consultationType: 'personal' | 'business', action: 'start' | 'message' | 'complete', metadata?: Record<string, any>) => {
    trackEvent('consultation_interaction', {
      consultationType,
      action,
      ...metadata,
      userType: 'visitor'
    });
  };

  return {
    trackAnonymousUser,
    trackUserAction,
    trackPageVisit,
    trackDocumentInteraction,
    trackConsultationInteraction
  };
};