import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLawyerAuth } from '@/hooks/useLawyerAuth';
import { Scale, Lock, Key } from 'lucide-react';
import DOMPurify from 'dompurify';

interface LawyerLoginProps {
  onLoginSuccess: () => void;
}

export default function LawyerLogin({ onLoginSuccess }: LawyerLoginProps) {
  const [token, setToken] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { loginWithToken } = useLawyerAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Input validation and sanitization
    const sanitizedToken = DOMPurify.sanitize(token.trim());
    
    if (!sanitizedToken) {
      setErrorMessage('Por favor ingresa tu token de acceso');
      return;
    }

    if (sanitizedToken.length < 32) {
      setErrorMessage('El token debe tener al menos 32 caracteres');
      return;
    }

    setIsLoggingIn(true);
    setErrorMessage('');

    try {
      const success = await loginWithToken(sanitizedToken);
      console.log('Lawyer login result:', success);
      if (success) {
        console.log('Lawyer login successful, calling onLoginSuccess');
        onLoginSuccess();
      } else {
        setErrorMessage('Token inválido o expirado. Contacta al administrador.');
      }
    } catch (error) {
      console.error('Lawyer login error:', error);
      setErrorMessage('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <Scale className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Portal del Abogado</CardTitle>
          <CardDescription>
            Ingresa tu token de acceso para gestionar documentos legales y agentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
              <Alert variant="destructive">
                <Lock className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="token">Token de Acceso</Label>
              <Input
                id="token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Ingresa tu token proporcionado por el administrador"
                required
                disabled={isLoggingIn}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Si no tienes un token, contacta al administrador del sistema para solicitar acceso.
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoggingIn}
              size="lg"
            >
              {isLoggingIn ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Acceder con Token
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              ¿No tienes un token de acceso?
            </p>
            <Button 
              variant="link" 
              onClick={() => window.location.assign('/?view=request-token')}
              className="text-primary"
            >
              Solicita acceso aquí
            </Button>
          </div>
          
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4" />
              Plataforma segura para profesionales del derecho
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}