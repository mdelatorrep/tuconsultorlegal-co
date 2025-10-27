import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Download, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLawyerAuth } from '@/hooks/useLawyerAuth';

export const SubscriptionSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const { validateAndRefreshSubscription } = useLawyerAuth();

  const subscriptionId = searchParams.get('subscription_id');
  const planName = searchParams.get('plan_name');
  const externalId = searchParams.get('external_id');

  useEffect(() => {
    // Validate subscription ONCE when arriving from successful payment
    const validatePayment = async () => {
      try {
        await validateAndRefreshSubscription();
      } catch (error) {
        console.error('Error validating subscription on success page:', error);
      } finally {
        setIsLoading(false);
      }
    };

    validatePayment();

    // Show success toast
    toast({
      title: "¡Suscripción Exitosa!",
      description: `Tu suscripción al ${planName || 'plan seleccionado'} ha sido activada correctamente.`,
      variant: "default"
    });
  }, []); // Empty deps - only run once on mount

  const handleGoToDashboard = () => {
    navigate('/#abogados');
  };

  const handleDownloadInvoice = () => {
    // TODO: Implement invoice download
    toast({
      title: "Factura",
      description: "La factura será enviada a tu correo electrónico en los próximos minutos.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Procesando tu suscripción...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center px-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">
            ¡Bienvenido a tu Plan Premium!
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            Tu suscripción ha sido activada exitosamente
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Subscription Details */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-foreground">Detalles de tu Suscripción</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Plan:</span>
                <span className="ml-2 font-medium">{planName || 'Plan Premium'}</span>
              </div>
              {subscriptionId && (
                <div>
                  <span className="text-muted-foreground">ID de Suscripción:</span>
                  <span className="ml-2 font-mono text-xs">{subscriptionId}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <span className="ml-2 font-medium text-green-600">Activo</span>
              </div>
              <div>
                <span className="text-muted-foreground">Facturación:</span>
                <span className="ml-2 font-medium">Mensual</span>
              </div>
            </div>
          </div>

          {/* Features Unlocked */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Funciones Desbloqueadas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                'Acceso a todas las herramientas de IA',
                'CRM avanzado para gestión de clientes',
                'Análisis legal automatizado',
                'Redacción de documentos con IA',
                'Soporte prioritario 24/7',
                'Investigación legal avanzada'
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleGoToDashboard}
              className="flex-1 flex items-center justify-center space-x-2"
            >
              <span>Ir al Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDownloadInvoice}
              className="flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Factura</span>
            </Button>
          </div>

          {/* Additional Information */}
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Próximos Pasos</h4>
            </div>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-6">
              <li>• Recibirás un correo de confirmación en los próximos minutos</li>
              <li>• Tu factura será enviada a tu email registrado</li>
              <li>• Puedes gestionar tu suscripción desde el dashboard</li>
              <li>• Nuestro equipo de soporte está disponible 24/7</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};