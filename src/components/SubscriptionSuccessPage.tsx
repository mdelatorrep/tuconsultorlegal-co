import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useLawyerAuth } from '@/hooks/useLawyerAuth';

export const SubscriptionSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { validateAndRefreshSubscription } = useLawyerAuth();

  const subscriptionId = searchParams.get('subscription_id');
  const planName = searchParams.get('plan_name');

  useEffect(() => {
    // Refresh subscription status when user returns from payment
    validateAndRefreshSubscription();
  }, [validateAndRefreshSubscription]);

  const handleGoToDashboard = () => {
    navigate('/#abogados');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-700">
            ¡Suscripción Exitosa!
          </CardTitle>
          <CardDescription>
            Tu suscripción ha sido activada correctamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {planName && (
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                Plan activado: <strong>{decodeURIComponent(planName)}</strong>
              </p>
            </div>
          )}
          
          {subscriptionId && (
            <div className="text-center text-sm text-muted-foreground">
              ID de suscripción: {subscriptionId}
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-semibold">¿Qué puedes hacer ahora?</h4>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• Acceder a todas las herramientas de IA</li>
              <li>• Utilizar el CRM avanzado</li>
              <li>• Crear agentes personalizados</li>
              <li>• Generar contenido legal automatizado</li>
            </ul>
          </div>

          <Button 
            onClick={handleGoToDashboard}
            className="w-full"
          >
            Ir al Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};