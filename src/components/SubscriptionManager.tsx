import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionPlanSelector } from './SubscriptionPlanSelector';
import { useLawyerAuthContext } from './LawyerAuthProvider';

export const SubscriptionManager: React.FC = () => {
  const { user } = useLawyerAuthContext();
  const { 
    plans, 
    currentSubscription, 
    isLoading, 
    fetchCurrentSubscription,
    cancelSubscription,
    reactivateSubscription 
  } = useSubscription();

  useEffect(() => {
    if (user?.id) {
      fetchCurrentSubscription(user.id);
    }
  }, [user?.id, fetchCurrentSubscription]);

  const getCurrentPlan = () => {
    if (!currentSubscription) return null;
    return plans.find(plan => plan.id === currentSubscription.plan_id);
  };

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (status === 'active' && !cancelAtPeriodEnd) {
      return <Badge className="bg-green-100 text-green-800">Activa</Badge>;
    }
    if (status === 'active' && cancelAtPeriodEnd) {
      return <Badge variant="destructive">Cancelando</Badge>;
    }
    if (status === 'pending') {
      return <Badge variant="outline">Pendiente</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge variant="secondary">Cancelada</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleCancelSubscription = async () => {
    if (!currentSubscription?.id) return;
    
    if (window.confirm('¿Estás seguro de que quieres cancelar tu suscripción? Se cancelará al final del período actual.')) {
      await cancelSubscription(currentSubscription.id);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!currentSubscription?.id) return;
    
    await reactivateSubscription(currentSubscription.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="h-20 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlan = getCurrentPlan();

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      {currentSubscription && currentPlan ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Tu Suscripción Actual</span>
                </CardTitle>
                <CardDescription>
                  Gestiona tu plan de suscripción
                </CardDescription>
              </div>
              {getStatusBadge(currentSubscription.status, currentSubscription.cancel_at_period_end)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold text-lg">{currentPlan.name}</h4>
                <p className="text-muted-foreground">{currentPlan.description}</p>
                <div className="mt-2">
                  <span className="text-2xl font-bold">
                    ${currentSubscription.billing_cycle === 'yearly' 
                      ? (currentPlan.yearlyPrice / 12).toLocaleString('es-CO', { maximumFractionDigits: 0 })
                      : currentPlan.monthlyPrice.toLocaleString('es-CO', { maximumFractionDigits: 0 })
                    }
                  </span>
                  <span className="text-muted-foreground">/mes</span>
                  {currentSubscription.billing_cycle === 'yearly' && (
                    <Badge variant="outline" className="ml-2">Facturación Anual</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {currentSubscription.current_period_start && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Inicio: {formatDate(currentSubscription.current_period_start)}</span>
                  </div>
                )}
                {currentSubscription.current_period_end && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {currentSubscription.cancel_at_period_end ? 'Finaliza' : 'Renueva'}: {formatDate(currentSubscription.current_period_end)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Subscription Actions */}
            <div className="flex space-x-2 pt-4 border-t">
              {currentSubscription.cancel_at_period_end ? (
                <Button
                  onClick={handleReactivateSubscription}
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Reactivar Suscripción</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleCancelSubscription}
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Cancelar Suscripción</span>
                </Button>
              )}
            </div>

            {/* Cancellation Notice */}
            {currentSubscription.cancel_at_period_end && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Tu suscripción se cancelará el {formatDate(currentSubscription.current_period_end!)}. 
                  Aún tienes acceso a todas las funciones hasta esa fecha.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No tienes una suscripción activa. Selecciona un plan para comenzar.
          </AlertDescription>
        </Alert>
      )}

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Planes Disponibles</CardTitle>
          <CardDescription>
            Cambia tu plan en cualquier momento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionPlanSelector 
            onPlanSelected={(planId, billingCycle) => {
              // Handle plan selection - could redirect to upgrade flow
              console.log('Plan selected:', { planId, billingCycle });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};