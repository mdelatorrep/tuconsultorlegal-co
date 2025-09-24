import { useEffect } from 'react';
import { useAuthTypeDetection } from '@/hooks/useAuthTypeDetection';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredUserType?: 'user' | 'lawyer';
  onRedirect?: (redirectTo: string) => void;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiredUserType, 
  onRedirect 
}) => {
  const { userType, isAuthenticated, loading } = useAuthTypeDetection();

  useEffect(() => {
    if (loading) return;

    // If no specific user type is required, show content for authenticated users
    if (!requiredUserType) {
      if (isAuthenticated) return;
      onRedirect?.('home');
      return;
    }

    // Check if user type matches required type
    if (isAuthenticated && userType === requiredUserType) {
      return; // Allow access
    }

    // Handle mismatched user types
    if (isAuthenticated) {
      if (userType === 'lawyer' && requiredUserType === 'user') {
        console.log('Lawyer attempted to access user area, redirecting to lawyer dashboard');
        onRedirect?.('abogados');
        return;
      }
      
      if (userType === 'user' && requiredUserType === 'lawyer') {
        console.log('Regular user attempted to access lawyer area, redirecting to user dashboard');
        onRedirect?.('user-dashboard');
        return;
      }
    }

    // If not authenticated, redirect to home
    if (!isAuthenticated) {
      onRedirect?.('home');
    }
  }, [userType, isAuthenticated, loading, requiredUserType, onRedirect]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // If we reach here, access is granted
  return <>{children}</>;
};