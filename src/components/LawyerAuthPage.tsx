import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, CheckCircle } from 'lucide-react';
import LawyerLogin from './LawyerLogin';
import Header from './Header';
import { useToast } from '@/hooks/use-toast';

export default function LawyerAuthPage() {
  const { toast } = useToast();

  // Detectar confirmación de email al cargar (cuando viene de /auth-abogados#access_token=...)
  useEffect(() => {
    const hash = window.location.hash;
    
    // Detectar errores de auth (link expirado, etc.)
    if (hash.includes('error=')) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const errorCode = hashParams.get('error_code');
      
      if (errorCode === 'otp_expired') {
        toast({
          title: "Enlace expirado",
          description: "El enlace de confirmación ha expirado. Por favor regístrate nuevamente.",
          variant: "destructive",
          duration: 8000,
        });
      }
      
      // Limpiar la URL
      setTimeout(() => {
        window.history.replaceState({}, document.title, '/auth-abogados');
      }, 100);
    }
    
    // Detectar confirmación exitosa
    if (hash.includes('access_token=') && hash.includes('type=signup')) {
      toast({
        title: "¡Email confirmado exitosamente!",
        description: "Tu cuenta ha sido activada. Ahora puedes iniciar sesión.",
        duration: 8000,
      });
      
      // Limpiar la URL
      setTimeout(() => {
        window.history.replaceState({}, document.title, '/auth-abogados');
      }, 2000);
    }
  }, [toast]);

  const handleNavigate = (page: string) => {
    if (page === 'home') {
      window.location.replace('/');
    } else if (page === 'abogados') {
      // Forzar navegación completa al dashboard de abogados
      window.location.replace('/#abogados');
    } else {
      window.location.replace(`/#${page}`);
    }
  };

  const handleOpenChat = (message?: string) => {
    // Navigate to home and open chat
    window.location.href = '/' + (message ? `?chat=${encodeURIComponent(message)}` : '');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-gray-light to-background">
      {/* Header del Home */}
      <Header 
        currentPage="auth-abogados" 
        onNavigate={handleNavigate}
        onOpenChat={handleOpenChat}
      />

      {/* Login Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4">
                <Shield className="w-4 h-4 mr-2" />
                Acceso Seguro
              </Badge>
              <h2 className="text-4xl font-bold mb-4">
                <span className="text-primary">Inicia Sesión</span> o{' '}
                <span className="text-primary">Crea tu Cuenta</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Comienza en menos de 2 minutos. Sin tarjeta de crédito requerida para probar.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Benefits */}
              <div className="space-y-8">
                <h3 className="text-2xl font-semibold mb-6">¿Por qué sumarte a Praxis Hub?</h3>
                
                <div className="space-y-6">
                  {[
                    "Entorno integrado para elevar tu práctica legal",
                    "Herramientas profesionales para trabajo de calidad",
                    "Seguridad y confidencialidad garantizadas",
                    "Soporte técnico especializado continuo",
                    "Acceso a jurisprudencia y normativa actualizada",
                    "Estándares profesionales desde el primer día"
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>

                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-3">
                      <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-semibold mb-2">Compromiso con tu Práctica</h4>
                        <p className="text-sm text-muted-foreground">
                          30 días para explorar el entorno. Si no cumple con tus expectativas 
                          profesionales, te devolvemos el 100% de tu inversión.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Login Form */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-brand-blue-light/5 rounded-3xl blur-3xl"></div>
                <div className="relative">
                  <LawyerLogin onLoginSuccess={() => window.location.replace('/')} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
