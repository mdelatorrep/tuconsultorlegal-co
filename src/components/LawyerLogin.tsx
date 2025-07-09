import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Scale, Lock, FileText, Eye, EyeOff } from 'lucide-react';
import DOMPurify from 'dompurify';

interface LawyerLoginProps {
  onLoginSuccess: () => void;
}

export default function LawyerLogin({ onLoginSuccess }: LawyerLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAdminAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Input validation and sanitization
    const sanitizedEmail = DOMPurify.sanitize(email.trim().toLowerCase());
    const sanitizedPassword = DOMPurify.sanitize(password);
    
    if (!sanitizedEmail || !sanitizedPassword) {
      setErrorMessage('Por favor completa todos los campos');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      setErrorMessage('Por favor ingresa un email válido');
      return;
    }

    setIsLoggingIn(true);
    setErrorMessage('');

    try {
      const success = await login(sanitizedEmail, sanitizedPassword);
      console.log('Lawyer login result:', success);
      if (success) {
        console.log('Lawyer login successful, calling onLoginSuccess');
        onLoginSuccess();
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
            Accede a tu panel de trabajo para revisar y gestionar documentos legales pendientes de tus clientes.
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
              <Label htmlFor="email">Email Profesional</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.email@bufete.com"
                required
                disabled={isLoggingIn}
                autoComplete="email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoggingIn}
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoggingIn}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
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
                  <FileText className="h-4 w-4 mr-2" />
                  Acceder al Portal
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
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