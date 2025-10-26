import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, CheckCircle, Scale } from 'lucide-react';
import LawyerLogin from './LawyerLogin';

export default function LawyerAuthPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-gray-light to-background">
      {/* Sticky Quick Access Bar */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">Portal Abogados</span>
            </div>
            
            <a 
              href="/#abogados" 
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Volver al Portal
            </a>
          </div>
        </div>
      </div>

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
                <h3 className="text-2xl font-semibold mb-6">¿Por qué elegir nuestra plataforma?</h3>
                
                <div className="space-y-6">
                  {[
                    "IA especializada en derecho colombiano",
                    "Integración completa con tu flujo de trabajo",
                    "Seguridad bancaria para datos confidenciales",
                    "Soporte técnico especializado 24/7",
                    "Actualizaciones constantes de jurisprudencia",
                    "ROI comprobado desde el primer mes"
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                      <span className="text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>

                <Card className="border-success/20 bg-success/5">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-3">
                      <Shield className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-semibold mb-2">Garantía de Satisfacción</h4>
                        <p className="text-sm text-muted-foreground">
                          30 días de prueba gratuita. Si no estás completamente satisfecho, 
                          te devolvemos el 100% de tu inversión.
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
                  <LawyerLogin onLoginSuccess={() => window.location.href = '/#abogados'} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
