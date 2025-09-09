import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionPlan {
  id: string | number;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  isPopular?: boolean;
  planToken?: string;
  currency?: string;
  country?: string;
  active?: boolean;
  subscribeUrl?: string;
}

interface LawyerSubscription {
  id: string;
  lawyer_id: string;
  plan_id: string;
  status: string;
  billing_cycle: 'monthly' | 'yearly';
  current_period_start?: string;
  current_period_end?: string;
  dlocal_subscription_id?: string;
  cancel_at_period_end: boolean;
}

export const useSubscription = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([
    {
      id: 'free',
      name: 'Plan Gratuito',
      description: 'Acceso básico a documentos legales',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        'Acceso a documentos básicos',
        'Soporte por email',
        'Dashboard básico'
      ],
      active: true
    }
  ]);
  const [currentSubscription, setCurrentSubscription] = useState<LawyerSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch available subscription plans from dLocal API
  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Fetching dLocal plans...');
      
      const { data, error } = await supabase.functions.invoke('dlocal-get-plans');
      
      if (error) {
        console.error('❌ Error fetching subscription plans:', error);
        toast({
          title: "Error",
          description: "Error al cargar los planes de suscripción",
          variant: "destructive"
        });
        // Set only the free plan if there's an error
        const freePlan = {
          id: 'free',
          name: 'Plan Gratuito',
          description: 'Acceso básico a documentos legales',
          monthlyPrice: 0,
          yearlyPrice: 0,
          features: [
            'Acceso a documentos básicos',
            'Soporte por email',
            'Dashboard básico'
          ],
          active: true
        };
        setPlans([freePlan]);
        return;
      }

      console.log('✅ Raw dLocal API response:', data);
      console.log('📊 Available plans in response:', data?.data);
      
      // Verify we have data
      if (!data) {
        console.error('❌ No data received from dLocal API');
        throw new Error('No data received from dLocal API');
      }
      
      if (!data.data || !Array.isArray(data.data)) {
        console.error('❌ Invalid dLocal response structure:', data);
        throw new Error('Invalid response from dLocal API - missing data array');
      }

      console.log('🔍 Filtering active plans...');
      const activePlans = data.data.filter((plan: any) => plan.active === true);
      console.log('✅ Active plans found:', activePlans);

      // Map dLocal plans to our format
      const mappedPlans = activePlans.map((plan: any) => {
        console.log('🗺️ Mapping plan:', plan);
        console.log('💰 Plan currency:', plan.currency, 'Amount:', plan.amount);
        console.log('🔗 Subscribe URL:', plan.subscribe_url);
        return {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          monthlyPrice: plan.amount,
          yearlyPrice: plan.amount * 12, // Assuming yearly is 12x monthly for now
          features: [
            'Acceso a todas las herramientas de IA',
            'CRM avanzado',
            'Soporte prioritario',
            'Análisis legal',
            'Redacción automatizada'
          ],
          active: plan.active,
          planToken: plan.plan_token,
          currency: plan.currency || 'USD', // Default to USD if not specified
          country: plan.country || 'CO',
          subscribeUrl: plan.subscribe_url
        };
      });

      console.log('🎯 Mapped plans:', mappedPlans);

      const freePlan = {
        id: 'free',
        name: 'Plan Gratuito',
        description: 'Acceso básico a documentos legales',
        monthlyPrice: 0,
        yearlyPrice: 0,
        features: [
          'Acceso a documentos básicos',
          'Soporte por email',
          'Dashboard básico'
        ],
        active: true
      };
      
      const finalPlans = [freePlan, ...mappedPlans];
      console.log('📋 Final plans to set:', finalPlans);
      setPlans(finalPlans);
      
      if (mappedPlans.length === 0) {
        console.warn('⚠️ No active premium plans found, showing only free plan');
        toast({
          title: "Información",
          description: "Actualmente solo está disponible el plan gratuito. Los planes premium están siendo configurados.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('💥 Error fetching plans:', error);
      // Keep the free plan even if API fails
      const freePlan = {
        id: 'free',
        name: 'Plan Gratuito',
        description: 'Acceso básico a documentos legales',
        monthlyPrice: 0,
        yearlyPrice: 0,
        features: [
          'Acceso a documentos básicos',
          'Soporte por email',
          'Dashboard básico'
        ],
        active: true
      };
      setPlans([freePlan]);
      toast({
        title: "Error",
        description: "Error al cargar los planes de suscripción. Solo se muestra el plan gratuito.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch current lawyer subscription
  const fetchCurrentSubscription = async (lawyerId: string) => {
    try {
      console.log(`🔍 Fetching subscription for lawyer: ${lawyerId}`);
      
      const { data, error } = await supabase
        .from('lawyer_subscriptions' as any)
        .select('*')
        .eq('lawyer_id', lawyerId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
        throw error;
      }
      
      console.log(`📋 Current subscription found:`, data);
      setCurrentSubscription(data as unknown as LawyerSubscription);
    } catch (error) {
      console.error('Error fetching current subscription:', error);
      setCurrentSubscription(null);
    }
  };

  // Sync subscriptions from dLocal (useful after payments)
  const syncSubscriptions = async () => {
    try {
      console.log('🔄 Syncing subscriptions from dLocal...');
      const { data, error } = await supabase.functions.invoke('dlocal-admin-sync-subscriptions');
      
      if (error) {
        console.error('❌ Error syncing subscriptions:', error);
        return false;
      }
      
      console.log('✅ Subscription sync completed:', data);
      return true;
    } catch (error) {
      console.error('💥 Sync subscriptions failed:', error);
      return false;
    }
  };

  // Create a new subscription
  const createSubscription = async (planId: string | number, billingCycle: 'monthly' | 'yearly') => {
    setIsLoading(true);
    
    // Handle free plan selection
    if (planId === 'free') {
      toast({
        title: "Plan Gratuito Seleccionado",
        description: "Ya tienes acceso al plan gratuito con funcionalidades básicas",
      });
      setIsLoading(false);
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authenticated user');
      }

      console.log('Creating subscription for plan:', planId, 'billing cycle:', billingCycle);

      const { data, error } = await supabase.functions.invoke('dlocal-create-subscription', {
        body: { planId, billingCycle },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      console.log('Subscription creation response:', data);

      // If there's a redirect URL (for dLocal checkout), open it
      if (data.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
        toast({
          title: "Redirigiendo a pago",
          description: "Te hemos redirigido a la plataforma de pago segura",
        });
      } else {
        toast({
          title: "Procesando suscripción",
          description: "Tu suscripción está siendo procesada",
        });
      }

      // Refresh current subscription after a delay to allow webhook processing
      if (session.user) {
        // Immediate refresh
        await fetchCurrentSubscription(session.user.id);
        
        // Set up periodic refresh for webhook updates with sync
        let attempts = 0;
        const maxAttempts = 12; // 12 attempts over 2 minutes
        const refreshInterval = setInterval(async () => {
          attempts++;
          console.log(`🔄 Refreshing subscription status - attempt ${attempts}`);
          
          // Every 3rd attempt, try to sync from dLocal
          if (attempts % 3 === 0) {
            console.log(`🔄 Attempting dLocal sync on attempt ${attempts}`);
            await syncSubscriptions();
          }
          
          await fetchCurrentSubscription(session.user.id);
          
          if (attempts >= maxAttempts) {
            clearInterval(refreshInterval);
            console.log('⏰ Stopped refreshing subscription status');
          }
        }, 10000); // Every 10 seconds
      }

      return data;
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: "Error",
        description: "Error al crear la suscripción. Intenta nuevamente.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel subscription
  const cancelSubscription = async (subscriptionId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('dlocal-manage-subscription', {
        body: { 
          action: 'cancel',
          subscriptionId 
        }
      });

      if (error) throw error;

      toast({
        title: "Suscripción cancelada",
        description: "Tu suscripción será cancelada al final del período actual"
      });

      // Refresh current subscription
      const user = await supabase.auth.getUser();
      if (user.data.user) {
        await fetchCurrentSubscription(user.data.user.id);
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: "Error",
        description: "Error al cancelar la suscripción. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reactivate subscription
  const reactivateSubscription = async (subscriptionId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('dlocal-manage-subscription', {
        body: { 
          action: 'reactivate',
          subscriptionId 
        }
      });

      if (error) throw error;

      toast({
        title: "Suscripción reactivada",
        description: "Tu suscripción ha sido reactivada exitosamente"
      });

      // Refresh current subscription
      const user = await supabase.auth.getUser();
      if (user.data.user) {
        await fetchCurrentSubscription(user.data.user.id);
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      toast({
        title: "Error",
        description: "Error al reactivar la suscripción. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('🎯 useSubscription: useEffect triggered, calling fetchPlans...');
    fetchPlans().catch(error => {
      console.error('💥 fetchPlans failed in useEffect:', error);
    });
  }, []);

  return {
    plans,
    currentSubscription,
    isLoading,
    fetchPlans,
    fetchCurrentSubscription,
    createSubscription,
    cancelSubscription,
    reactivateSubscription,
    syncSubscriptions
  };
};