import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import AILegalPaymentLoader from './AILegalPaymentLoader';

const PaymentTracker: React.FC = () => {
  const [email, setEmail] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const { trackPayment, isLoading: isTracking } = useSubscription();

  const handleTrack = async () => {
    if (!email.trim()) return;
    
    const result = await trackPayment(email, customerId);
    setTrackingResult(result);
  };

  const getStatusIcon = (found: boolean) => {
    if (found) return <CheckCircle className="w-5 h-5 text-success" />;
    return <AlertCircle className="w-5 h-5 text-destructive" />;
  };

  if (isTracking) {
    return (
      <AILegalPaymentLoader 
        stage="syncing"
        message="Rastreando información de pago en dLocal..."
        progress={75}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Trazabilidad de Pagos dLocal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="email">Email del Usuario</Label>
              <Input
                id="email"
                type="email"
                placeholder="mdelatorrep@outlook.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="customerId">ID del Cliente (Opcional)</Label>
              <Input
                id="customerId"
                placeholder="19165324252243484567"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={handleTrack} 
            disabled={!email.trim() || isTracking}
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isTracking ? 'animate-spin' : ''}`} />
            Rastrear Pago
          </Button>

          {trackingResult && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  {getStatusIcon(trackingResult.found)}
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">
                      {trackingResult.found ? 'Pago Encontrado' : 'Pago No Encontrado'}
                    </h3>
                    
                    {trackingResult.subscription && (
                      <div className="space-y-2 text-sm">
                        <p><strong>Estado:</strong> {trackingResult.subscription.status}</p>
                        <p><strong>Plan ID:</strong> {trackingResult.subscription.plan_id}</p>
                        <p><strong>dLocal ID:</strong> {trackingResult.subscription.dlocal_subscription_id || 'N/A'}</p>
                        <p><strong>Creado:</strong> {new Date(trackingResult.subscription.created_at).toLocaleString()}</p>
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground mt-2">
                      <strong>Próximo paso:</strong> {trackingResult.nextStep}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentTracker;