import React, { createContext, useContext, ReactNode } from 'react';
import { useLawyerAuth } from '@/hooks/useLawyerAuth';

interface LawyerAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  session: any;
  loginWithEmailAndPassword: (email: string, password: string) => Promise<boolean>;
  signUpWithEmailAndPassword: (email: string, password: string, fullName: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
}

const LawyerAuthContext = createContext<LawyerAuthContextType | undefined>(undefined);

interface LawyerAuthProviderProps {
  children: ReactNode;
}

export const LawyerAuthProvider: React.FC<LawyerAuthProviderProps> = ({ children }) => {
  const authValues = useLawyerAuth();

  return (
    <LawyerAuthContext.Provider value={authValues}>
      {children}
    </LawyerAuthContext.Provider>
  );
};

export const useLawyerAuthContext = (): LawyerAuthContextType => {
  const context = useContext(LawyerAuthContext);
  if (context === undefined) {
    throw new Error('useLawyerAuthContext must be used within a LawyerAuthProvider');
  }
  return context;
};