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
  active?: boolean;
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
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<LawyerSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch available subscription plans from dLocal API
  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('dlocal-get-plans');
      
      if (error) {
        console.error('Error fetching subscription plans:', error);
        setPlans([]);
        return;
      }

      console.log('Fetched dLocal plans:', data);
      // Filter only active plans
      const activePlans = (data.plans || []).filter((plan: SubscriptionPlan) => plan.active !== false);
      setPlans(activePlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      setPlans([]);
      toast({
        title: "Error",
        description: "No se pudieron cargar los planes de suscripción",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch current lawyer subscription
  const fetchCurrentSubscription = async (lawyerId: string) => {
    try {
      const { data, error } = await supabase
        .from('lawyer_subscriptions' as any)
        .select('*')
        .eq('lawyer_id', lawyerId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentSubscription(data as unknown as LawyerSubscription);
    } catch (error) {
      console.error('Error fetching current subscription:', error);
    }
  };

  // Create a new subscription
  const createSubscription = async (planId: string | number, billingCycle: 'monthly' | 'yearly') => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authenticated user');
      }

      const { data, error } = await supabase.functions.invoke('dlocal-create-subscription', {
        body: { planId, billingCycle },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // If there's a redirect URL (for dLocal checkout), open it
      if (data.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
      }

      toast({
        title: "Redirigiendo a pago",
        description: "Te hemos redirigido a la plataforma de pago segura",
      });

      // Refresh current subscription
      if (session.user) {
        await fetchCurrentSubscription(session.user.id);
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
    fetchPlans();
  }, []);

  return {
    plans,
    currentSubscription,
    isLoading,
    fetchPlans,
    fetchCurrentSubscription,
    createSubscription,
    cancelSubscription,
    reactivateSubscription
  };
};