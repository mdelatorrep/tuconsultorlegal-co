import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLawyerAuth } from '@/hooks/useLawyerAuth';
import { Scale, Lock, Mail, User, Eye, EyeOff, ArrowLeft, CheckCircle, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionPlanSelector } from './SubscriptionPlanSelector';
import { useSubscription } from '@/hooks/useSubscription';

interface LawyerLoginProps {
  onLoginSuccess: () => void;
}

type ViewMode = 'login' | 'register' | 'forgot-password' | 'change-password' | 'select-plan';

export default function LawyerLogin({ onLoginSuccess }: LawyerLoginProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false);
  const [intellectualPropertyConsent, setIntellectualPropertyConsent] = useState(false);
  
  const { loginWithEmailAndPassword, signUpWithEmailAndPassword, resetPassword, updatePassword } = useLawyerAuth();
  const { toast } = useToast();
  const { createSubscription } = useSubscription();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setErrorMessage('Por favor completa todos los campos');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Por favor ingresa un email válido');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const success = await loginWithEmailAndPassword(email, password);
      
      if (success) {
        toast({
          title: "¡Bienvenido!",
          description: "Has iniciado sesión exitosamente.",
        });
        onLoginSuccess();
      } else {
        setErrorMessage('Credenciales inválidas. Verifica tu email y contraseña.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword || !fullName) {
      setErrorMessage('Por favor completa todos los campos');
      return;
    }

    if (!dataProcessingConsent) {
      setErrorMessage('Debes aceptar el tratamiento de datos personales');
      return;
    }

    if (!intellectualPropertyConsent) {
      setErrorMessage('Debes aceptar los términos de propiedad intelectual');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Por favor ingresa un email válido');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      console.log('=== HANDLEREGISTER START ===');
      console.log('Form data:', { email, fullName, passwordLength: password.length });
      
      console.log('=== CALLING SIGNUP FUNCTION ===');
      const result = await signUpWithEmailAndPassword(email, password, fullName);
      console.log('=== SIGNUP FUNCTION RETURNED ===');
      console.log('Signup result:', result);
      
      if (result.success) {
        if (result.requiresConfirmation) {
          // Email confirmation required
          console.log('=== EMAIL CONFIRMATION REQUIRED ===');
          toast({
            title: "¡Registro exitoso!",
            description: "Revisa tu email para confirmar tu cuenta antes de continuar con la selección del plan.",
            duration: 6000
          });
          // Switch to login view
          setViewMode('login');
        } else {
          // Auto-confirmed, proceed to plan selection
          console.log('=== REGISTRATION SUCCESS - MOVING TO PLAN SELECTION ===');
          toast({
            title: "¡Registro exitoso!",
            description: "Ahora selecciona tu plan de suscripción.",
          });
          setViewMode('select-plan');
        }
      } else {
        console.log('=== REGISTRATION FAILED - SHOWING ERROR MESSAGE ===');
        setErrorMessage('Error al registrar la cuenta. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('=== HANDLEREGISTER CATCH ERROR ===');
      console.error('Register error details:', {
        message: error?.message || 'Unknown error',
        name: error?.name || 'Unknown',
        stack: error?.stack || 'No stack trace'
      });
      // Show specific error message if available
      if (error?.message) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Error de conexión. Intenta nuevamente.');
      }
    } finally {
      console.log('=== HANDLEREGISTER COMPLETE ===');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setErrorMessage('Por favor ingresa tu email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Por favor ingresa un email válido');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const success = await resetPassword(email);
      
      if (success) {
        toast({
          title: "Email enviado",
          description: "Revisa tu email para las instrucciones de recuperación.",
        });
        setViewMode('login');
      } else {
        setErrorMessage('Error al enviar el email de recuperación.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setErrorMessage('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setErrorMessage('Por favor completa todos los campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const success = await updatePassword(newPassword);
      
      if (success) {
        toast({
          title: "Contraseña actualizada",
          description: "Tu contraseña ha sido cambiada exitosamente.",
        });
        setViewMode('login');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMessage('Error al cambiar la contraseña.');
      }
    } catch (error) {
      console.error('Change password error:', error);
      setErrorMessage('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelection = async (planId: string, billingCycle: 'monthly' | 'yearly') => {
    setIsLoading(true);
    try {
      await createSubscription(planId, billingCycle);
      toast({
        title: "¡Bienvenido!",
        description: "Tu cuenta ha sido configurada exitosamente.",
      });
      onLoginSuccess();
    } catch (error) {
      console.error('Error creating subscription:', error);
      // Don't block user from continuing, just log them in
      toast({
        title: "¡Bienvenido!",
        description: "Tu cuenta ha sido creada exitosamente.",
      });
      onLoginSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (viewMode) {
      case 'register':
        return 'Registro de Abogado';
      case 'forgot-password':
        return 'Recuperar Contraseña';
      case 'change-password':
        return 'Cambiar Contraseña';
      case 'select-plan':
        return 'Selecciona tu Plan';
      default:
        return 'Portal del Abogado';
    }
  };

  const getDescription = () => {
    switch (viewMode) {
      case 'register':
        return 'Crea tu cuenta para acceder al portal de abogados.';
      case 'forgot-password':
        return 'Ingresa tu email para recibir instrucciones de recuperación.';
      case 'change-password':
        return 'Ingresa tu nueva contraseña.';
      case 'select-plan':
        return 'Elige el plan que mejor se adapte a tus necesidades.';
      default:
        return 'Ingresa tu email y contraseña para gestionar documentos legales.';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-hero">
      <CardContent className="p-8">
            {/* Tabs para Login/Register */}
            {(viewMode === 'login' || viewMode === 'register') && (
              <div className="flex gap-2 mb-6 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode('login')}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                    viewMode === 'login'
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('register')}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                    viewMode === 'register'
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Crear Cuenta
                </button>
              </div>
            )}

            <div className="mb-6">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <Scale className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-2">{getTitle()}</h3>
              <p className="text-muted-foreground text-center text-sm">{getDescription()}</p>
            </div>

            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <Lock className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

          {viewMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu.email@ejemplo.com"
                  required
                  disabled={isLoading}
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
                    placeholder="Ingresa tu contraseña"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Iniciar Sesión
                  </>
                )}
              </Button>

              <div className="text-center pt-4 space-y-2">
                <Button 
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('forgot-password')}
                  disabled={isLoading}
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </div>
            </form>
          )}

          {viewMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu.email@ejemplo.com"
                  required
                  disabled={isLoading}
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
                    placeholder="Mínimo 6 caracteres"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Consentimientos Legales */}
              <div className="space-y-3 pt-4 border-t">
                {/* Política de Privacidad */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="dataProcessingConsent"
                    checked={dataProcessingConsent}
                    onCheckedChange={(checked) => setDataProcessingConsent(checked as boolean)}
                    disabled={isLoading}
                    className="mt-0.5"
                  />
                  <Label 
                    htmlFor="dataProcessingConsent" 
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    Acepto la{' '}
                    <a 
                      href="/#privacidad" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80 font-medium"
                    >
                      Política de Privacidad
                    </a>
                    {' '}y el tratamiento de datos personales conforme a la Ley 1581 de 2012 *
                  </Label>
                </div>

                {/* Términos y Condiciones */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="termsConsent"
                    checked={intellectualPropertyConsent}
                    onCheckedChange={(checked) => setIntellectualPropertyConsent(checked as boolean)}
                    disabled={isLoading}
                    className="mt-0.5"
                  />
                  <Label 
                    htmlFor="termsConsent" 
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    Acepto los{' '}
                    <a 
                      href="/#terminos" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80 font-medium"
                    >
                      Términos y Condiciones
                    </a>
                    {' '}y la{' '}
                    <a 
                      href="/#propiedad-intelectual" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80 font-medium"
                    >
                      Política de Propiedad Intelectual
                    </a>
                    {' '}*
                  </Label>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4 mr-2" />
                    Crear Cuenta Gratis
                  </>
                )}
              </Button>

              <div className="text-center pt-4">
                <Button 
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('login')}
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Login
                </Button>
              </div>
            </form>
          )}

          {viewMode === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu.email@ejemplo.com"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar Recuperación
                  </>
                )}
              </Button>

              <div className="text-center pt-4">
                <Button 
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('login')}
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Login
                </Button>
              </div>
            </form>
          )}

          {viewMode === 'change-password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu nueva contraseña"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Cambiando...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Cambiar Contraseña
                  </>
                )}
              </Button>

              <div className="text-center pt-4">
                <Button 
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('login')}
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Login
                </Button>
              </div>
            </form>
          )}

          {viewMode === 'select-plan' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  ¡Felicidades! Tu cuenta ha sido creada exitosamente.
                </p>
                <p className="text-sm text-muted-foreground">
                  Ahora selecciona el plan que mejor se adapte a tus necesidades:
                </p>
              </div>
              
              <SubscriptionPlanSelector 
                onPlanSelected={handlePlanSelection}
                showCycleToggle={true}
                defaultCycle="monthly"
                className="max-w-4xl mx-auto"
              />

              <div className="text-center pt-4">
                <Button 
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Skip plan selection and go directly to dashboard
                    toast({
                      title: "¡Bienvenido!",
                      description: "Puedes seleccionar un plan más tarde desde tu dashboard.",
                    });
                    onLoginSuccess();
                  }}
                  disabled={isLoading}
                >
                  Saltar por ahora
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
  );
}