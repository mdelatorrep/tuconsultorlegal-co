import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, CheckCircle } from 'lucide-react';
import logoIcon from "@/assets/favicon.png";
import { Checkbox } from './ui/checkbox';
import { PasswordResetDialog } from './PasswordResetDialog';
import { MagicLinkDialog } from './MagicLinkDialog';
import { useTermsAudit } from '@/hooks/useTermsAudit';

interface UserAuthPageProps {
  onBack: () => void;
  onAuthSuccess: () => void;
}

export default function UserAuthPage({ onBack, onAuthSuccess }: UserAuthPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [showEmailConfirmedMessage, setShowEmailConfirmedMessage] = useState(false);
  const { logRegistrationTerms } = useTermsAudit();
  
  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        onAuthSuccess();
      }
    };
    checkAuth();
    
    // Detectar confirmación de email al cargar el componente
    const hash = window.location.hash;
    
    // Verificar si la URL contiene parámetros de confirmación de email
    if (hash.includes('access_token=') && hash.includes('type=signup')) {
      console.log('Email confirmation detected for user');
      setShowEmailConfirmedMessage(true);
      setActiveTab('login');
      
      // Mostrar toast de confirmación
      toast.success('¡Email confirmado exitosamente! Tu cuenta ha sido activada. Ahora puedes iniciar sesión.', {
        duration: 8000,
      });
      
      // Limpiar la URL después de 2 segundos
      setTimeout(() => {
        window.history.replaceState({}, document.title, '/');
        setShowEmailConfirmedMessage(false);
      }, 2000);
    }
  }, [onAuthSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Credenciales inválidas. Verifica tu email y contraseña.');
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        toast.success('¡Bienvenido de vuelta!');
        onAuthSuccess();
      }
    } catch (error: any) {
      toast.error('Error al iniciar sesión: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!termsAccepted) {
      toast.error('Debes aceptar los términos y condiciones');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      // VALIDAR TIPO DE USUARIO ANTES DE REGISTRAR
      console.log('Validating user type before signup');
      const { data: validationData, error: validationError } = await supabase.functions.invoke('validate-user-type', {
        body: {
          email: email.trim().toLowerCase(),
          requestedType: 'user'
        }
      });

      if (validationError) {
        console.error('Validation error:', validationError);
        toast.error('Error al validar el usuario');
        setIsLoading(false);
        return;
      }

      if (!validationData.canRegister) {
        console.error('Cannot register:', validationData.error);
        toast.error(validationData.error);
        
        // Si ya existe con otro tipo, redirigir al login correcto
        if (validationData.loginUrl) {
          setTimeout(() => {
            window.location.href = validationData.loginUrl;
          }, 2000);
        }
        
        setIsLoading(false);
        return;
      }

      console.log('Validation passed, proceeding with signup');
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            is_lawyer: false
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast.error('Este email ya está registrado. Intenta iniciar sesión.');
          setActiveTab('login');
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        // AUDITORÍA: Registrar aceptación de términos (CUMPLIMIENTO REGULATORIO)
        await logRegistrationTerms(
          'user',
          email,
          fullName,
          data.user.id,
          true, // data_processing_consent
          undefined, // intellectual_property_consent (no aplica para usuarios)
          false // marketing_consent
        );
        
        // Check if email confirmation is required
        const requiresConfirmation = !data.session;
        
        if (requiresConfirmation) {
          // Email confirmation required - show message and don't log in
          toast.success('¡Cuenta creada! Revisa tu email para confirmar tu cuenta antes de iniciar sesión.', {
            duration: 6000
          });
          setActiveTab('login');
        } else {
          // Auto-confirmed (confirmation disabled in Supabase) - allow immediate access
          toast.success('¡Cuenta creada exitosamente! Puedes comenzar a usar la plataforma.');
          onAuthSuccess();
        }
      }
    } catch (error: any) {
      toast.error('Error al crear cuenta: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-soft border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0 hover:bg-muted/50">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <img src={logoIcon} alt="Praxis Hub" className="w-5 h-5" />
                  <CardTitle className="text-2xl font-bold text-brand-primary">Praxis Hub</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Entorno profesional integrado
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-muted/30">
                <TabsTrigger value="login" className="text-sm font-medium">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup" className="text-sm font-medium">Crear Cuenta</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-6">
                {showEmailConfirmedMessage && (
                  <Alert className="mb-4 bg-brand-accent/10 border-brand-accent/30">
                    <CheckCircle className="h-4 w-4 text-brand-accent" />
                    <AlertDescription className="text-foreground">
                      ¡Email confirmado exitosamente! Tu cuenta ha sido activada. Ahora puedes iniciar sesión con tus credenciales.
                    </AlertDescription>
                  </Alert>
                )}
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Correo electrónico</Label>
                    <div className="relative">
                      <Input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        required
                        className="pl-10"
                      />
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="pl-10 pr-10"
                      />
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <PasswordResetDialog />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-brand-primary hover:bg-brand-primary/90"
                    size="lg"
                  >
                    {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">O accede con</span>
                    </div>
                  </div>

                  <MagicLinkDialog />
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nombre completo</Label>
                    <div className="relative">
                      <Input
                        id="signup-name"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Juan Pérez"
                        required
                        className="pl-10"
                      />
                      <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Correo electrónico</Label>
                    <div className="relative">
                      <Input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        required
                        className="pl-10"
                      />
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="pl-10 pr-10"
                      />
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="pl-10"
                      />
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                    />
                    <Label htmlFor="terms" className="text-sm leading-relaxed">
                      Acepto los{' '}
                      <a 
                        href="/#terminos" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-primary underline hover:text-brand-primary/80"
                      >
                        términos y condiciones
                      </a>
                      {' '}y la{' '}
                      <a 
                        href="/#privacidad" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-primary underline hover:text-brand-primary/80"
                      >
                        política de privacidad
                      </a>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !termsAccepted}
                    className="w-full bg-brand-primary hover:bg-brand-primary/90"
                    size="lg"
                  >
                    {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
