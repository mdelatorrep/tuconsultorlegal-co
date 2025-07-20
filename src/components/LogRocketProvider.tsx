import React, { createContext, useContext, ReactNode } from 'react';
import { useLogRocket, useLegalTracking } from '@/hooks/useLogRocket';

interface LogRocketContextType {
  identifyUser: (user: any) => void;
  trackEvent: (eventName: string, properties?: Record<string, any>) => void;
  trackDocumentGeneration: (documentType: string, success: boolean, metadata?: Record<string, any>) => void;
  trackConsultationStart: (consultationType: 'personal' | 'business', advisor?: string) => void;
  trackPayment: (amount: number, currency: string, paymentMethod: string, documentType?: string) => void;
  trackAgentInteraction: (agentType: string, interactionType: 'chat' | 'document_review' | 'legal_advice', metadata?: Record<string, any>) => void;
  captureException: (error: Error, extra?: Record<string, any>) => void;
  startSession: (sessionName?: string) => void;
}

const LogRocketContext = createContext<LogRocketContextType | null>(null);

interface LogRocketProviderProps {
  children: ReactNode;
}

export const LogRocketProvider: React.FC<LogRocketProviderProps> = ({ children }) => {
  const logRocketMethods = useLogRocket();
  const legalTracking = useLegalTracking();

  const contextValue: LogRocketContextType = {
    identifyUser: logRocketMethods.identifyUser,
    trackEvent: logRocketMethods.trackEvent,
    trackDocumentGeneration: legalTracking.trackDocumentGeneration,
    trackConsultationStart: legalTracking.trackConsultationStart,
    trackPayment: legalTracking.trackPayment,
    trackAgentInteraction: legalTracking.trackAgentInteraction,
    captureException: logRocketMethods.captureException,
    startSession: logRocketMethods.startSession,
  };

  return (
    <LogRocketContext.Provider value={contextValue}>
      {children}
    </LogRocketContext.Provider>
  );
};

export const useLogRocketContext = (): LogRocketContextType => {
  const context = useContext(LogRocketContext);
  if (!context) {
    throw new Error('useLogRocketContext must be used within a LogRocketProvider');
  }
  return context;
};

export default LogRocketProvider;