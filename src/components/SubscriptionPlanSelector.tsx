import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check, Star, Crown } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AILegalPaymentLoader from './AILegalPaymentLoader';
import { LawyerTermsAndConditions } from './LawyerTermsAndConditions';

interface SubscriptionPlanSelectorProps {
  onPlanSelected?: (planId: string, billingCycle: 'monthly' | 'yearly') => void;
  showCycleToggle?: boolean;
  defaultCycle?: 'monthly' | 'yearly';
  className?: string;
}

export const SubscriptionPlanSelector: React.FC<SubscriptionPlanSelectorProps> = ({
  onPlanSelected,
  showCycleToggle = true,
  defaultCycle = 'monthly',
  className = ''
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(defaultCycle);
  const [isCreating, setIsCreating] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const { plans, isLoading, createSubscription } = useSubscription();
  const { toast } = useToast();

  const handleSelectPlan = async (plan: any) => {
    console.log('🎯 Plan selected:', plan);
    console.log('💰 Plan ID:', plan.id, 'Type:', typeof plan.id);
    
    // Handle free plan selection (no terms needed)
    if (plan.id === 'free') {
      console.log('📄 Free plan selected');
      if (onPlanSelected) {
        onPlanSelected(plan.id, billingCycle);
      }
      return;
    }
    
    // For premium plans, show terms and conditions first
    setSelectedPlan(plan);
    setShowTerms(true);
  };

  const handleTermsAccept = async () => {
    if (!selectedPlan) return;
    
    try {
      setShowTerms(false);
      setIsCreating(true);
      
      // Get current user for personalization
      const { data: { user } } = await supabase.auth.getUser();
      
      // For premium plans with subscribeUrl, create personalized URL
      if (selectedPlan.subscribeUrl) {
        console.log('🔗 Creating personalized dLocal subscribe URL:', selectedPlan.subscribeUrl);
        
        let personalizedUrl = selectedPlan.subscribeUrl;
        
        // Add email parameter if user is authenticated
        if (user?.email) {
          const separator = personalizedUrl.includes('?') ? '&' : '?';
          personalizedUrl += `${separator}email=${encodeURIComponent(user.email)}`;
        }
        
        // Add external_id for tracking
        if (user?.id) {
          const separator = personalizedUrl.includes('?') ? '&' : '?';
          personalizedUrl += `${separator}external_id=${user.id}`;
        }
        
        console.log('🚀 Opening personalized URL:', personalizedUrl);
        window.open(personalizedUrl, '_blank');
        return;
      }
      
      // Fallback: use the create subscription flow
      console.log('💎 Premium plan selected, creating subscription...');
      console.log('🔄 Calling createSubscription with plan ID:', selectedPlan.id, 'cycle:', billingCycle);
      const result = await createSubscription(selectedPlan.id, billingCycle);
      console.log('✅ Subscription result:', result);
      
    } catch (error) {
      console.error('❌ Error in handleTermsAccept:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar la suscripción. Por favor, intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
      setSelectedPlan(null);
    }
  };

  const handleTermsDecline = () => {
    setShowTerms(false);
    setSelectedPlan(null);
  };

  const formatPrice = (monthlyPrice: number, yearlyPrice: number, currency = 'USD') => {
    const currencySymbol = currency === 'USD' ? 'USD $' : '$';
    
    if (billingCycle === 'yearly') {
      const monthlyEquivalent = yearlyPrice / 12;
      return {
        price: `${currencySymbol}${monthlyEquivalent.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        period: '/mes',
        savings: monthlyPrice > monthlyEquivalent ? `Ahorra ${currencySymbol}${((monthlyPrice - monthlyEquivalent) * 12).toLocaleString('es-CO', { maximumFractionDigits: 0 })} al año` : null
      };
    }
    return {
      price: `${currencySymbol}${monthlyPrice.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
      period: '/mes',
      savings: null
    };
  };

  const getPlanIcon = (planName: string) => {
    if (planName.toLowerCase().includes('premium') || planName.toLowerCase().includes('pro')) {
      return <Crown className="h-6 w-6 text-primary" />;
    }
    return <Star className="h-6 w-6 text-muted-foreground" />;
  };

  const isPlanPopular = (planName: string) => {
    return planName.toLowerCase().includes('premium') || planName.toLowerCase().includes('pro');
  };

  // Show payment loader when creating subscription
  if (isCreating) {
    return (
      <AILegalPaymentLoader 
        stage="processing"
        message="Configurando tu suscripción con dLocal..."
        progress={25}
      />
    );
  }

  if (isLoading) {
    console.log('SubscriptionPlanSelector: Loading plans...');
    return (
      <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="text-center">
              <div className="h-6 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  console.log('📊 SubscriptionPlanSelector: Rendering plans:', plans);
  console.log('📊 Plans count:', plans.length);
  console.log('📊 isLoading:', isLoading);

  // Show message if no plans are available
  if (!isLoading && plans.length === 0) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <p className="text-muted-foreground">No hay planes disponibles en este momento.</p>
        <p className="text-sm text-muted-foreground mt-2">Por favor, intenta nuevamente más tarde.</p>
      </div>
    );
  }

  return (
    <>
      <LawyerTermsAndConditions
        open={showTerms}
        onAccept={handleTermsAccept}
        onDecline={handleTermsDecline}
      />
      
      <div className={`space-y-6 ${className}`}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
          const pricing = formatPrice(plan.monthlyPrice, plan.yearlyPrice, plan.currency);
          const isPopular = isPlanPopular(plan.name);
          const isFree = plan.monthlyPrice === 0;

          return (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-200 hover:shadow-lg ${
                isPopular ? 'border-primary shadow-md' : ''
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Más Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-2">
                  {getPlanIcon(plan.name)}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm">
                  {plan.description}
                </CardDescription>
                
                <div className="mt-4">
                  <div className="text-3xl font-bold text-foreground">
                    {pricing.price}
                    <span className="text-lg font-normal text-muted-foreground">
                      {pricing.period}
                    </span>
                  </div>
                  {pricing.savings && (
                    <p className="text-sm text-green-600 mt-1">
                      {pricing.savings}
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    console.log('🖱️ Button clicked!');
                    handleSelectPlan(plan);
                  }}
                  className={`w-full transition-all duration-200 ${
                    isPopular 
                      ? 'bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl' 
                      : isFree 
                      ? 'bg-secondary hover:bg-secondary/90' 
                      : 'bg-accent hover:bg-accent/90 hover:shadow-md'
                  }`}
                  disabled={isLoading || isCreating}
                >
                  {(isLoading || isCreating) ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Procesando...</span>
                    </div>
                  ) : (
                    isFree ? 'Seleccionar Plan Gratuito' : 'Seleccionar Plan'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
          })}
        </div>
      </div>
    </>
  );
};