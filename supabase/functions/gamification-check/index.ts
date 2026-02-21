import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, lawyerId, taskKey, progressData } = await req.json();

    console.log(`[GAMIFICATION] Processing action: ${action} for lawyer ${lawyerId}`);

    // Only support 'claim' action
    if (action !== 'claim') {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Only "claim" is supported.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lawyerId || !taskKey) {
      return new Response(
        JSON.stringify({ error: 'lawyerId and taskKey are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check gamification enabled
    const { data: enabledConfig } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'gamification_enabled')
      .single();

    if (enabledConfig?.config_value === 'false' || enabledConfig?.config_value === false) {
      return new Response(
        JSON.stringify({ error: 'Gamification is disabled', disabled: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get task
    const { data: task, error: taskError } = await supabase
      .from('gamification_tasks')
      .select('*')
      .eq('task_key', taskKey)
      .eq('is_active', true)
      .single();

    if (taskError || !task) {
      console.error('[GAMIFICATION] Task not found:', taskKey, taskError);
      return new Response(
        JSON.stringify({ error: 'Task not found', taskKey }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check existing progress
    const { data: existingProgress } = await supabase
      .from('gamification_progress')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .eq('task_id', task.id)
      .single();

    // For daily tasks, check if already claimed today
    if (task.task_type === 'daily' && existingProgress?.status === 'claimed') {
      const claimedAt = new Date(existingProgress.claimed_at);
      const today = new Date();
      if (claimedAt.toDateString() === today.toDateString()) {
        return new Response(
          JSON.stringify({ error: 'Task already claimed today', alreadyClaimed: true, claimed: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // For one-time tasks, check if already claimed
    if (task.task_type === 'onetime' && existingProgress?.status === 'claimed') {
      return new Response(
        JSON.stringify({ error: 'Task already claimed', alreadyClaimed: true, claimed: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const completionCount = (existingProgress?.completion_count || 0) + 1;
    const now = new Date().toISOString();
    const creditReward = task.credit_reward;

    // Upsert progress - directly to 'claimed' status
    const { error: upsertError } = await supabase
      .from('gamification_progress')
      .upsert({
        lawyer_id: lawyerId,
        task_id: task.id,
        status: 'claimed',
        completion_count: completionCount,
        progress_data: progressData || {},
        completed_at: now,
        claimed_at: now
      }, { onConflict: 'lawyer_id,task_id' });

    if (upsertError) {
      console.error('[GAMIFICATION] Error updating progress:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to update progress' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Award credits and update streak
    const { data: credits } = await supabase
      .from('lawyer_credits')
      .select('current_balance, total_earned, current_streak, longest_streak, last_activity_date')
      .eq('lawyer_id', lawyerId)
      .single();

    const newBalance = (credits?.current_balance || 0) + creditReward;
    const newTotalEarned = (credits?.total_earned || 0) + creditReward;

    // Calculate streak
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const lastActivity = credits?.last_activity_date;
    let newStreak = credits?.current_streak || 0;
    let newLongestStreak = credits?.longest_streak || 0;

    if (lastActivity !== todayStr) {
      // Check if last activity was yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastActivity === yesterdayStr) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
      newLongestStreak = Math.max(newLongestStreak, newStreak);
    }

    await supabase.from('lawyer_credits').upsert({
      lawyer_id: lawyerId,
      current_balance: newBalance,
      total_earned: newTotalEarned,
      current_streak: newStreak,
      longest_streak: newLongestStreak,
      last_activity_date: todayStr,
      updated_at: now
    }, { onConflict: 'lawyer_id' });

    await supabase.from('credit_transactions').insert({
      lawyer_id: lawyerId,
      transaction_type: 'gamification',
      amount: creditReward,
      balance_after: newBalance,
      reference_type: 'task',
      reference_id: task.id,
      description: `Misión completada: ${task.name}`
    });

    console.log(`[GAMIFICATION] Task ${taskKey} claimed. Awarded ${creditReward} credits. Streak: ${newStreak}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        claimed: true,
        creditsAwarded: creditReward,
        newBalance,
        taskName: task.name,
        badge: task.badge_name,
        streak: newStreak
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GAMIFICATION] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
