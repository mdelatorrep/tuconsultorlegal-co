import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const SubscriptionErrorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const externalId = searchParams.get('external_id');

  useEffect(() => {
    // Show error toast
    toast({
      title: "Error en la Suscripción",
      description: errorDescription || "Ocurrió un error al procesar tu suscripción. Por favor, intenta nuevamente.",
      variant: "destructive"
    });
  }, [errorDescription, toast]);

  const handleRetry = () => {
    navigate('/#abogados?tab=subscription&retry=true');
  };

  const handleGoBack = () => {
    navigate('/#abogados');
  };

  const handleContactSupport = () => {
    navigate('/contacto');
  };

  const getErrorMessage = () => {
    switch (error) {
      case 'payment_failed':
        return {
          title: 'Pago Rechazado',
          description: 'Tu método de pago fue rechazado. Por favor, verifica los datos de tu tarjeta o intenta con otro método de pago.',
          suggestions: [
            'Verifica que los datos de tu tarjeta sean correctos',
            'Asegúrate de tener fondos suficientes',
            'Intenta con una tarjeta diferente',
            'Contacta a tu banco si el problema persiste'
          ]
        };
      case 'expired_card':
        return {
          title: 'Tarjeta Expirada',
          description: 'La tarjeta de crédito proporcionada ha expirado.',
          suggestions: [
            'Verifica la fecha de expiración de tu tarjeta',
            'Usa una tarjeta vigente',
            'Contacta a tu banco para renovar tu tarjeta'
          ]
        };
      case 'insufficient_funds':
        return {
          title: 'Fondos Insuficientes',
          description: 'No hay fondos suficientes en tu cuenta para completar la transacción.',
          suggestions: [
            'Verifica el saldo de tu cuenta',
            'Intenta con otro método de pago',
            'Contacta a tu banco'
          ]
        };
      case 'cancelled':
        return {
          title: 'Pago Cancelado',
          description: 'El proceso de pago fue cancelado. Puedes intentar nuevamente cuando gustes.',
          suggestions: [
            'El pago fue cancelado por el usuario',
            'No se realizó ningún cargo',
            'Puedes intentar nuevamente'
          ]
        };
      default:
        return {
          title: 'Error en el Proceso',
          description: errorDescription || 'Ocurrió un error inesperado durante el proceso de suscripción.',
          suggestions: [
            'Intenta nuevamente en unos minutos',
            'Verifica tu conexión a internet',
            'Contacta a soporte si el problema persiste'
          ]
        };
    }
  };

  const errorInfo = getErrorMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 flex items-center justify-center px-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-red-600 dark:text-red-400">
            {errorInfo.title}
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            {errorInfo.description}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Details */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-red-900 dark:text-red-100">Detalles del Error</h3>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-red-700 dark:text-red-300">Código:</span>
                  <span className="ml-2 font-mono">{error}</span>
                </div>
                {externalId && (
                  <div>
                    <span className="text-red-700 dark:text-red-300">ID de Referencia:</span>
                    <span className="ml-2 font-mono text-xs">{externalId}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Suggestions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">¿Qué puedes hacer?</h3>
            <ul className="space-y-2">
              {errorInfo.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleRetry}
              className="flex-1 flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Intentar Nuevamente</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleGoBack}
              className="flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </Button>
            
            <Button
              variant="secondary"
              onClick={handleContactSupport}
              className="flex items-center justify-center space-x-2"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Contactar Soporte</span>
            </Button>
          </div>

          {/* Support Information */}
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-blue-900 dark:text-blue-100">¿Necesitas Ayuda?</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Nuestro equipo de soporte está disponible 24/7 para ayudarte. 
              Si el problema persiste, no dudes en contactarnos con el código de error mostrado arriba.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};