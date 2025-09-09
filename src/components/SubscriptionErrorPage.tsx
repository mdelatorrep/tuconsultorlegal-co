import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export const SubscriptionErrorPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const handleRetryPayment = () => {
    navigate('/#abogados?tab=subscription');
  };

  const handleGoBack = () => {
    navigate('/#abogados');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-red-700">
            Error en el Pago
          </CardTitle>
          <CardDescription>
            No se pudo procesar tu suscripción
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                <strong>Error:</strong> {decodeURIComponent(error)}
                {errorDescription && (
                  <div className="mt-1">
                    {decodeURIComponent(errorDescription)}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <h4 className="font-semibold">¿Qué puedes hacer?</h4>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• Verificar que tu tarjeta tenga fondos suficientes</li>
              <li>• Asegurarte de que los datos sean correctos</li>
              <li>• Intentar con otro método de pago</li>
              <li>• Contactar a tu banco si el problema persiste</li>
            </ul>
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={handleRetryPayment}
              variant="default"
              className="flex-1"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
            <Button 
              onClick={handleGoBack}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};