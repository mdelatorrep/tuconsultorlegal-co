import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Plan {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  frequency: string;
  status: string;
  created_at: string;
  trial_period_days?: number;
  max_billing_cycles?: number;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  created_at: string;
  current_period_start: string;
  current_period_end: string;
  lawyer_name?: string;
  lawyer_email?: string;
  plan_name?: string;
  amount?: number;
  currency?: string;
  local_data?: any;
}

interface Execution {
  id: string;
  subscription_id: string;
  status: string;
  amount: number;
  currency: string;
  executed_at: string;
  payment_method?: string;
  failure_reason?: string;
}

interface CreatePlanData {
  name: string;
  description: string;
  amount: number;
  currency: string;
  frequency_type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  frequency_value?: number;
  max_periods?: number;
  notification_url?: string;
  success_url?: string;
  cancel_url?: string;
}

interface UpdatePlanData {
  planId: string;
  name?: string;
  description?: string;
  amount?: number;
  notification_url?: string;
  success_url?: string;
  error_url?: string;
}

export const useSubscriptionAdmin = (authHeaders: Record<string, string>) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Plans management
  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dlocal-get-plans', {
        headers: authHeaders
      });

      if (error) throw error;
      setPlans(data.plans || []);
      return data.plans || [];
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los planes",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const createPlan = async (planData: CreatePlanData) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dlocal-admin-create-plan', {
        body: planData,
        headers: authHeaders
      });

      if (error) throw error;

      toast({
        title: "Plan creado",
        description: "El plan se ha creado exitosamente"
      });

      return data;
    } catch (error) {
      console.error('Error creating plan:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el plan",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePlan = async (updateData: UpdatePlanData) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dlocal-admin-update-plan', {
        body: updateData,
        headers: authHeaders
      });

      if (error) throw error;

      toast({
        title: "Plan actualizado",
        description: "El plan se ha actualizado exitosamente"
      });

      return data;
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el plan",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelPlan = async (planId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dlocal-admin-cancel-plan', {
        body: { planId },
        headers: authHeaders
      });

      if (error) throw error;

      toast({
        title: "Plan cancelado",
        description: "El plan se ha cancelado exitosamente"
      });

      return data;
    } catch (error) {
      console.error('Error canceling plan:', error);
      toast({
        title: "Error",
        description: "No se pudo cancelar el plan",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Subscriptions management
  const fetchSubscriptions = async (planId?: string) => {
    setIsLoading(true);
    try {
      const url = planId ? `?planId=${planId}` : '';
      const { data, error } = await supabase.functions.invoke('dlocal-admin-get-subscriptions' + url, {
        headers: authHeaders
      });

      if (error) throw error;
      setSubscriptions(data.subscriptions || []);
      return data.subscriptions || [];
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las suscripciones",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const modifySubscription = async (
    subscriptionId: string, 
    action: 'change_plan' | 'cancel' | 'pause' | 'resume',
    planId?: string
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dlocal-admin-modify-subscription', {
        body: {
          subscriptionId,
          action,
          planId,
          prorate: true
        },
        headers: authHeaders
      });

      if (error) throw error;

      toast({
        title: "Suscripción modificada",
        description: `La suscripción se ha ${action === 'cancel' ? 'cancelado' : 'modificado'} exitosamente`
      });

      return data;
    } catch (error) {
      console.error('Error modifying subscription:', error);
      toast({
        title: "Error",
        description: "No se pudo modificar la suscripción",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Executions management
  const fetchExecutions = async (subscriptionId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dlocal-admin-get-executions', {
        body: { subscriptionId },
        headers: authHeaders
      });

      if (error) throw error;
      setExecutions(data.executions || []);
      return data.executions || [];
    } catch (error) {
      console.error('Error fetching executions:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las ejecuciones",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // State
    plans,
    subscriptions,
    executions,
    isLoading,

    // Plans
    fetchPlans,
    createPlan,
    updatePlan,
    cancelPlan,

    // Subscriptions
    fetchSubscriptions,
    modifySubscription,

    // Executions
    fetchExecutions,

    // Setters for state management
    setPlans,
    setSubscriptions,
    setExecutions
  };
};