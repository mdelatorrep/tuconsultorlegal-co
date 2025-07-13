
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLawyerAuth } from '@/hooks/useLawyerAuth';
import { Scale, Lock, Key } from 'lucide-react';

interface LawyerLoginProps {
  onLoginSuccess: () => void;
}

export default function LawyerLogin({ onLoginSuccess }: LawyerLoginProps) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { loginWithEmailAndToken } = useLawyerAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();
    
    if (!cleanEmail) {
      setErrorMessage('Por favor ingresa tu email');
      return;
    }

    if (!cleanToken) {
      setErrorMessage('Por favor ingresa tu token de acceso');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Por favor ingresa un email válido');
      return;
    }

    setIsLoggingIn(true);
    setErrorMessage('');

    try {
      console.log('Submitting login form');
      const success = await loginWithEmailAndToken(cleanEmail, cleanToken);
      
      if (success) {
        console.log('Login successful, calling onLoginSuccess');
        onLoginSuccess();
      } else {
        setErrorMessage('Credenciales inválidas. Verifica tu email y token.');
      }
    } catch (error) {
      console.error('Login form error:', error);
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
            Ingresa tu email y token de acceso para gestionar documentos legales.
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.email@ejemplo.com"
                required
                disabled={isLoggingIn}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Token de Acceso</Label>
              <Input
                id="token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Ingresa tu token"
                required
                disabled={isLoggingIn}
                className="font-mono text-sm"
              />
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
                  Iniciar Sesión
                </>
              )}
            </Button>
            
            <div className="text-center pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">
                ¿No tienes token de acceso?
              </p>
              <Button 
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = '/?view=request-token'}
              >
                Solicitar Token de Acceso
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
