import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Shield, Lock, Settings, Eye, EyeOff } from 'lucide-react';
import DOMPurify from 'dompurify';
import AdminUnlockDialog from './AdminUnlockDialog';

interface SuperAdminLoginProps {
  onLoginSuccess: () => void;
}

export default function SuperAdminLogin({ onLoginSuccess }: SuperAdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  
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
      console.log('SuperAdmin login result:', success);
      if (success) {
        console.log('SuperAdmin login successful, calling onLoginSuccess');
        onLoginSuccess();
      }
    } catch (error: any) {
      console.error('SuperAdmin login error:', error);
      
      // Handle specific error messages
      if (error?.message?.includes('Account temporarily locked')) {
        setErrorMessage('Cuenta temporalmente bloqueada. Usa el desbloqueo de emergencia.');
        setShowUnlockDialog(true);
      } else if (error?.message?.includes('Too many attempts')) {
        setErrorMessage('Demasiados intentos de login. Espera unos minutos antes de intentar nuevamente.');
      } else if (error?.message?.includes('Invalid credentials')) {
        setErrorMessage('Credenciales inválidas. Verifica tu email y contraseña.');
      } else {
        setErrorMessage('Error de conexión. Intenta nuevamente en unos momentos.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <Settings className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Panel de Super Administración</CardTitle>
          <CardDescription>
            Acceso exclusivo para administradores del sistema. Gestiona usuarios, agentes y configuraciones avanzadas.
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
              <Label htmlFor="email">Email de Administrador</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sistema.com"
                required
                disabled={isLoggingIn}
                autoComplete="email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña de Administrador</Label>
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
                  Autenticando...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Acceder al Sistema
                </>
              )}
            </Button>
          </form>
          
          {/* Emergency unlock section */}
          {errorMessage.includes('bloqueada') && (
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
                <strong>¿Cuenta bloqueada?</strong><br />
                Usa la función de desbloqueo de emergencia con la clave del sistema.
              </p>
              <div className="mt-3 text-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowUnlockDialog(true)}
                  className="text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Desbloqueo de Emergencia
                </Button>
              </div>
            </div>
          )}

          <AdminUnlockDialog
            open={showUnlockDialog}
            onOpenChange={setShowUnlockDialog}
            email={email}
            onSuccess={() => {
              setErrorMessage('');
              setShowUnlockDialog(false);
            }}
          />
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4" />
              Conexión segura y encriptada - Solo personal autorizado
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}