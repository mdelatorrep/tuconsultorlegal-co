import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GamificationTask {
  id: string;
  task_key: string;
  name: string;
  description: string | null;
  credit_reward: number;
  task_type: string;
  completion_criteria: unknown;
  max_completions: number | null;
  icon: string | null;
  badge_name: string | null;
  is_active: boolean;
  display_order: number;
}

export interface GamificationProgress {
  id: string;
  lawyer_id: string;
  task_id: string;
  status: string;
  completion_count: number;
  progress_data: unknown;
  started_at: string;
  completed_at: string | null;
  claimed_at: string | null;
  task?: GamificationTask;
}

export interface ReferralInfo {
  id: string;
  referrer_id: string;
  referred_id: string | null;
  referred_email: string | null;
  referral_code: string;
  status: string;
  credits_awarded_referrer: number;
  credits_awarded_referred: number;
  credited_at: string | null;
  created_at: string;
}

export function useGamification(lawyerId: string | null) {
  const [tasks, setTasks] = useState<GamificationTask[]>([]);
  const [progress, setProgress] = useState<GamificationProgress[]>([]);
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [referrals, setReferrals] = useState<ReferralInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gamification_tasks')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Error fetching tasks:', error);
        return;
      }

      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, []);

  const fetchProgress = useCallback(async () => {
    if (!lawyerId) {
      setProgress([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gamification_progress')
        .select('*, task:gamification_tasks(*)')
        .eq('lawyer_id', lawyerId);

      if (error) {
        console.error('Error fetching progress:', error);
        return;
      }

      setProgress(data || []);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  }, [lawyerId]);

  const fetchReferralInfo = useCallback(async () => {
    if (!lawyerId) {
      setReferralInfo(null);
      setReferrals([]);
      return;
    }
    // Get own referral code
    const { data: ownReferral, error: ownError } = await supabase
      .from('lawyer_referrals')
      .select('*')
      .eq('referrer_id', lawyerId)
      .is('referred_id', null)
      .maybeSingle();

    if (ownError) {
      console.error('Error fetching referral info:', ownError);
    } else {
      setReferralInfo(ownReferral);
    }

    // Get referrals made
    const { data: madeReferrals, error: referralsError } = await supabase
      .from('lawyer_referrals')
      .select('*')
      .eq('referrer_id', lawyerId)
      .not('referred_id', 'is', null)
      .order('created_at', { ascending: false });

    if (referralsError) {
      console.error('Error fetching referrals:', referralsError);
    } else {
      setReferrals(madeReferrals || []);
    }
  }, [lawyerId]);

  const checkAndClaimTask = useCallback(async (taskKey: string) => {
    if (!lawyerId) return { success: false };

    try {
      const { data, error } = await supabase.functions.invoke('gamification-check', {
        body: { lawyerId, taskKey, action: 'claim' }
      });

      if (error) throw error;

      if (data.claimed) {
        toast({
          title: '🎉 ¡Tarea completada!',
          description: `Has ganado ${data.creditsAwarded} créditos por "${data.taskName}"`,
        });
        await fetchProgress();
      }

      return { success: true, ...data };
    } catch (error) {
      console.error('Error claiming task:', error);
      return { success: false };
    }
  }, [lawyerId, fetchProgress, toast]);

  const processReferral = useCallback(async (referralCode: string) => {
    if (!lawyerId) return { success: false };

    try {
      const { data, error } = await supabase.functions.invoke('referral-process', {
        body: { lawyerId, referralCode, action: 'use' }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: '🎁 ¡Código aplicado!',
          description: `Has recibido ${data.creditsAwarded} créditos de bienvenida`,
        });
      }

      return data;
    } catch (error) {
      console.error('Error processing referral:', error);
      return { success: false };
    }
  }, [lawyerId, toast]);

  const getTaskProgress = useCallback((taskKey: string): GamificationProgress | undefined => {
    const task = tasks.find(t => t.task_key === taskKey);
    if (!task) return undefined;
    return progress.find(p => p.task_id === task.id);
  }, [tasks, progress]);

  const isTaskCompleted = useCallback((taskKey: string): boolean => {
    const prog = getTaskProgress(taskKey);
    return prog?.status === 'completed' || prog?.status === 'claimed';
  }, [getTaskProgress]);

  const isTaskClaimed = useCallback((taskKey: string): boolean => {
    const prog = getTaskProgress(taskKey);
    return prog?.status === 'claimed';
  }, [getTaskProgress]);

  const getCompletedTasksCount = useCallback((): number => {
    return progress.filter(p => p.status === 'completed' || p.status === 'claimed').length;
  }, [progress]);

  const getTotalCreditsEarned = useCallback((): number => {
    return progress
      .filter(p => p.status === 'claimed')
      .reduce((sum, p) => {
        const task = tasks.find(t => t.id === p.task_id);
        return sum + (task?.credit_reward || 0);
      }, 0);
  }, [progress, tasks]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchTasks(),
        fetchProgress(),
        fetchReferralInfo()
      ]);
      setLoading(false);
    };

    loadData();
  }, [fetchTasks, fetchProgress, fetchReferralInfo]);

  // Real-time subscription for gamification progress updates
  useEffect(() => {
    if (!lawyerId) return;

    const channel = supabase
      .channel(`gamification-realtime-${lawyerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gamification_progress'
        },
        (payload) => {
          const newData = payload.new as { lawyer_id?: string } | null;
          const oldData = payload.old as { lawyer_id?: string } | null;
          
          if (newData?.lawyer_id === lawyerId || oldData?.lawyer_id === lawyerId) {
            console.log('[Gamification] Progress updated via realtime:', payload);
            fetchProgress();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lawyer_notifications',
          filter: `lawyer_id=eq.${lawyerId}`
        },
        (payload) => {
          const notification = payload.new as { notification_type?: string } | null;
          if (notification?.notification_type === 'gamification') {
            console.log('[Gamification] New gamification notification:', payload);
            fetchProgress();
          }
        }
      )
      .subscribe((status) => {
        console.log('[Gamification] Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lawyerId, fetchProgress]);

  return {
    tasks,
    progress,
    referralInfo,
    referrals,
    loading,
    checkAndClaimTask,
    processReferral,
    getTaskProgress,
    isTaskCompleted,
    isTaskClaimed,
    getCompletedTasksCount,
    getTotalCreditsEarned,
    refreshProgress: fetchProgress,
    refreshReferrals: fetchReferralInfo
  };
}
