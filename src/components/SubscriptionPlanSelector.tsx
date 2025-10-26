import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check, Star, Crown, Scale, Sparkles } from 'lucide-react';
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
  showSuccessMessage?: boolean;
}

export const SubscriptionPlanSelector: React.FC<SubscriptionPlanSelectorProps> = ({
  onPlanSelected,
  showCycleToggle = true,
  defaultCycle = 'monthly',
  className = '',
  showSuccessMessage = true
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
      
      <div className={`min-h-screen bg-gradient-to-br from-background via-muted/30 to-background py-8 px-4 sm:px-6 lg:px-8 ${className}`}>
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12 animate-slide-up">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <Scale className="h-10 w-10 text-primary" />
            </div>
            
            {showSuccessMessage && (
              <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg max-w-2xl mx-auto">
                <p className="text-primary font-semibold flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  ¡Felicidades! Tu cuenta ha sido creada exitosamente.
                </p>
              </div>
            )}
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Selecciona tu Plan
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Elige el plan que mejor se adapte a tus necesidades profesionales
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {plans.map((plan) => {
          const pricing = formatPrice(plan.monthlyPrice, plan.yearlyPrice, plan.currency);
          const isPopular = isPlanPopular(plan.name);
          const isFree = plan.monthlyPrice === 0;

              return (
                <Card 
                  key={plan.id} 
                  className={`relative h-full flex flex-col transition-all duration-300 hover-lift-subtle ${
                    isPopular 
                      ? 'border-2 border-primary shadow-elevated scale-105' 
                      : 'border border-border hover:border-primary/50'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-primary to-primary-light text-primary-foreground px-4 py-1.5 text-sm font-semibold shadow-lg">
                        <Crown className="h-3.5 w-3.5 mr-1 inline" />
                        Más Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-6 pt-8">
                    <div className="flex justify-center mb-4">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
                        isPopular ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        {getPlanIcon(plan.name)}
                      </div>
                    </div>
                    
                    <CardTitle className="text-2xl font-bold mb-2">
                      {plan.name}
                    </CardTitle>
                    
                    <CardDescription className="text-sm min-h-[40px] px-2">
                      {plan.description}
                    </CardDescription>
                    
                    <div className="mt-6 mb-2">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl sm:text-5xl font-bold text-foreground">
                          {pricing.price}
                        </span>
                        <span className="text-lg text-muted-foreground font-medium">
                          {pricing.period}
                        </span>
                      </div>
                      {pricing.savings && (
                        <div className="mt-2 inline-block px-3 py-1 bg-green-500/10 rounded-full">
                          <p className="text-sm text-green-600 font-medium">
                            💰 {pricing.savings}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col space-y-6 px-6 pb-6">
                    <div className="flex-1">
                      <ul className="space-y-3">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center mt-0.5">
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </div>
                            <span className="text-sm text-foreground leading-relaxed">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        console.log('🖱️ Button clicked!');
                        handleSelectPlan(plan);
                      }}
                      size="lg"
                      className={`w-full transition-all duration-300 font-semibold ${
                        isPopular 
                          ? 'bg-primary hover:bg-primary-light shadow-lg hover:shadow-xl hover:scale-105' 
                          : isFree 
                          ? 'bg-secondary hover:bg-secondary-dark text-secondary-foreground' 
                          : 'bg-muted hover:bg-muted/80 text-foreground hover:shadow-md'
                      }`}
                      disabled={isLoading || isCreating}
                    >
                      {(isLoading || isCreating) ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Procesando...</span>
                        </div>
                      ) : (
                        isFree ? 'Comenzar Gratis' : 'Seleccionar Plan'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
            <p>Todos los planes incluyen soporte técnico y actualizaciones gratuitas.</p>
            <p className="mt-2">Puedes cambiar o cancelar tu plan en cualquier momento.</p>
          </div>
        </div>
      </div>
    </>
  );
};