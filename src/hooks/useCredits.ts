import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CreditBalance {
  id: string;
  lawyer_id: string;
  current_balance: number;
  total_earned: number;
  total_spent: number;
  last_purchase_at: string | null;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

export interface CreditPackage {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  bonus_credits: number;
  price_cop: number;
  discount_percentage: number | null;
  is_featured: boolean;
  display_order: number;
}

export interface CreditToolCost {
  id: string;
  tool_type: string;
  tool_name: string;
  credit_cost: number;
  description: string | null;
  icon: string | null;
  is_active: boolean;
}

export interface CreditTransaction {
  id: string;
  lawyer_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export function useCredits(lawyerId: string | null) {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [toolCosts, setToolCosts] = useState<CreditToolCost[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBalance = useCallback(async () => {
    if (!lawyerId) {
      setBalance(null);
      return;
    }

    const { data, error } = await supabase
      .from('lawyer_credits')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching balance:', error);
      return;
    }

    setBalance(data);
  }, [lawyerId]);

  const fetchPackages = useCallback(async () => {
    const { data, error } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error fetching packages:', error);
      return;
    }

    setPackages(data || []);
  }, []);

  const fetchToolCosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('credit_tool_costs')
      .select('*')
      .eq('is_active', true)
      .order('tool_name');

    if (error) {
      console.error('Error fetching tool costs:', error);
      return;
    }

    setToolCosts(data || []);
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!lawyerId) return;

    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching transactions:', error);
      return;
    }

    setTransactions(data || []);
  }, [lawyerId]);

  const consumeCredits = useCallback(async (toolType: string, metadata?: Record<string, unknown>) => {
    if (!lawyerId) {
      return { success: false, error: 'No lawyer ID' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('credits-consume', {
        body: { lawyerId, toolType, metadata }
      });

      if (error) {
        throw error;
      }

      if (!data.allowed) {
        toast({
          title: 'Créditos insuficientes',
          description: `Necesitas ${data.required} créditos para ${data.toolName}. Tu balance: ${data.currentBalance}`,
          variant: 'destructive'
        });
        return { success: false, error: 'Insufficient credits', ...data };
      }

      // Refresh balance & history after consumption
      await fetchBalance();
      await fetchTransactions();

      // Auto-claim daily_tool_use gamification task
      try {
        await supabase.functions.invoke('gamification-check', {
          body: { action: 'claim', lawyerId, taskKey: 'daily_tool_use' }
        });
        window.dispatchEvent(new Event('gamification:update'));
      } catch (e) {
        console.warn('[GAMIFICATION] Could not claim daily_tool_use:', e);
      }

      return { success: true, ...data };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error consuming credits';
      console.error('Error consuming credits:', error);
      return { success: false, error: errorMessage };
    }
  }, [lawyerId, fetchBalance, toast]);

  const getToolCost = useCallback((toolType: string): number => {
    const tool = toolCosts.find(t => t.tool_type === toolType);
    return tool?.credit_cost || 0;
  }, [toolCosts]);

  const hasEnoughCredits = useCallback((toolType: string): boolean => {
    const cost = getToolCost(toolType);
    return (balance?.current_balance || 0) >= cost;
  }, [balance, getToolCost]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (!lawyerId) {
        // Still load packages and tool costs (they're public)
        await Promise.all([fetchPackages(), fetchToolCosts()]);
        setLoading(false);
        return;
      }
      await Promise.all([
        fetchBalance(),
        fetchPackages(),
        fetchToolCosts(),
        fetchTransactions()
      ]);
      setLoading(false);
    };

    loadData();
  }, [lawyerId, fetchBalance, fetchPackages, fetchToolCosts, fetchTransactions]);

  // Subscribe to balance changes - listen to all changes and filter locally
  useEffect(() => {
    if (!lawyerId) return;

    const channel = supabase
      .channel(`credits-realtime-${lawyerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lawyer_credits'
        },
        (payload) => {
          // Filter locally to ensure we catch our lawyer's changes
          const newData = payload.new as { lawyer_id?: string } | null;
          const oldData = payload.old as { lawyer_id?: string } | null;
          
          if (newData?.lawyer_id === lawyerId || oldData?.lawyer_id === lawyerId) {
            console.log('Credits updated via realtime:', payload);
            fetchBalance();
            fetchTransactions();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'credit_transactions'
        },
        (payload) => {
          const newData = payload.new as { lawyer_id?: string } | null;
          if (newData?.lawyer_id === lawyerId) {
            console.log('New transaction via realtime:', payload);
            fetchBalance();
            fetchTransactions();
          }
        }
      )
      .subscribe((status) => {
        console.log('Credits realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lawyerId, fetchBalance, fetchTransactions]);

  // Manual refresh trigger (fallback when realtime is delayed)
  useEffect(() => {
    if (!lawyerId) return;

    const handler = () => {
      fetchBalance();
      fetchTransactions();
    };

    window.addEventListener('credits:refresh', handler);
    return () => window.removeEventListener('credits:refresh', handler);
  }, [lawyerId, fetchBalance, fetchTransactions]);

  return {
    balance,
    packages,
    toolCosts,
    transactions,
    loading,
    consumeCredits,
    getToolCost,
    hasEnoughCredits,
    refreshBalance: fetchBalance,
    refreshTransactions: fetchTransactions
  };
}
