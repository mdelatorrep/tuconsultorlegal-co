import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to get system config
async function getSystemConfig(supabase: any, configKey: string, defaultValue: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .single();
    return data?.config_value || defaultValue;
  } catch {
    return defaultValue;
  }
}

// Get multiple configs at once
async function getMultipleConfigs(supabase: any, keys: string[]): Promise<Record<string, string>> {
  try {
    const { data } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', keys);
    
    const result: Record<string, string> = {};
    data?.forEach((item: any) => {
      result[item.config_key] = item.config_value;
    });
    return result;
  } catch {
    return {};
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, lawyerId, taskKey, progressData } = await req.json();

    console.log(`[GAMIFICATION] Processing action: ${action} for lawyer ${lawyerId}`);

    // Get gamification configs
    const configs = await getMultipleConfigs(supabase, [
      'gamification_enabled',
      'gamification_points_config',
      'gamification_streak_bonus_multiplier',
      'gamification_daily_goal_credits',
      'gamification_levels'
    ]);

    const gamificationEnabled = configs['gamification_enabled'] !== 'false';
    
    if (!gamificationEnabled) {
      return new Response(
        JSON.stringify({ error: 'Gamification is disabled', disabled: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const streakMultiplier = parseFloat(configs['gamification_streak_bonus_multiplier'] || '1.5');
    const dailyGoal = parseInt(configs['gamification_daily_goal_credits'] || '50');
    
    let pointsConfig = {};
    let levels: any[] = [];
    
    try {
      pointsConfig = JSON.parse(configs['gamification_points_config'] || '{}');
      levels = JSON.parse(configs['gamification_levels'] || '[]');
    } catch (e) {
      console.error('[GAMIFICATION] Error parsing config JSON:', e);
    }

    if (action === 'get_progress') {
      if (!lawyerId) {
        return new Response(
          JSON.stringify({ error: 'lawyerId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: tasks, error: tasksError } = await supabase
        .from('gamification_tasks')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (tasksError) {
        console.error('[GAMIFICATION] Error fetching tasks:', tasksError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch tasks' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: progress, error: progressError } = await supabase
        .from('gamification_progress')
        .select('*')
        .eq('lawyer_id', lawyerId);

      if (progressError) {
        console.error('[GAMIFICATION] Error fetching progress:', progressError);
      }

      // Get lawyer credits for level calculation
      const { data: credits } = await supabase
        .from('lawyer_credits')
        .select('total_earned')
        .eq('lawyer_id', lawyerId)
        .single();

      const totalEarned = credits?.total_earned || 0;

      // Calculate current level
      let currentLevel = levels[0] || { level: 1, name: 'Novato', badge: '🌱' };
      for (const level of levels) {
        if (totalEarned >= level.minCredits) {
          currentLevel = level;
        }
      }

      // Merge tasks with progress
      const tasksWithProgress = tasks?.map(task => {
        const taskProgress = progress?.find(p => p.task_id === task.id);
        return {
          ...task,
          progress: taskProgress || null,
          isCompleted: taskProgress?.status === 'completed' || taskProgress?.status === 'claimed',
          isClaimed: taskProgress?.status === 'claimed'
        };
      });

      // Calculate stats
      const completedTasks = tasksWithProgress?.filter(t => t.isCompleted).length || 0;
      const totalTasks = tasks?.length || 0;
      const earnedBadges = tasksWithProgress?.filter(t => t.isClaimed && t.badge_name).map(t => ({
        name: t.badge_name,
        icon: t.icon,
        earnedAt: t.progress?.claimed_at
      })) || [];

      return new Response(
        JSON.stringify({ 
          tasks: tasksWithProgress,
          stats: {
            completedTasks,
            totalTasks,
            completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            dailyGoal,
            streakMultiplier
          },
          badges: earnedBadges,
          level: currentLevel,
          levels,
          pointsConfig
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'complete_task') {
      if (!lawyerId || !taskKey) {
        return new Response(
          JSON.stringify({ error: 'lawyerId and taskKey are required' }),
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
        return new Response(
          JSON.stringify({ error: 'Task not found' }),
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

      // For one-time tasks, check if already completed
      if (task.task_type === 'onetime' && existingProgress?.status === 'completed') {
        return new Response(
          JSON.stringify({ error: 'Task already completed', alreadyCompleted: true }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const completionCount = (existingProgress?.completion_count || 0) + 1;
      const now = new Date().toISOString();

      // Calculate credits with possible dynamic points from config
      let creditReward = task.credit_reward;
      const dynamicPoints = (pointsConfig as any)[taskKey];
      if (dynamicPoints && typeof dynamicPoints === 'number') {
        creditReward = dynamicPoints;
      }

      // Upsert progress
      const { error: upsertError } = await supabase
        .from('gamification_progress')
        .upsert({
          lawyer_id: lawyerId,
          task_id: task.id,
          status: 'completed',
          completion_count: completionCount,
          progress_data: progressData || {},
          completed_at: now
        }, { onConflict: 'lawyer_id,task_id' });

      if (upsertError) {
        console.error('[GAMIFICATION] Error updating progress:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Failed to update progress' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Award credits
      const { data: credits } = await supabase
        .from('lawyer_credits')
        .select('current_balance, total_earned')
        .eq('lawyer_id', lawyerId)
        .single();

      const newBalance = (credits?.current_balance || 0) + creditReward;
      const newTotalEarned = (credits?.total_earned || 0) + creditReward;

      await supabase.from('lawyer_credits').upsert({
        lawyer_id: lawyerId,
        current_balance: newBalance,
        total_earned: newTotalEarned,
        updated_at: now
      }, { onConflict: 'lawyer_id' });

      await supabase.from('credit_transactions').insert({
        lawyer_id: lawyerId,
        transaction_type: 'gamification',
        amount: creditReward,
        balance_after: newBalance,
        reference_type: 'task',
        reference_id: task.id,
        description: `Tarea completada: ${task.name}`
      });

      console.log(`[GAMIFICATION] Task ${taskKey} completed. Awarded ${creditReward} credits`);

      return new Response(
        JSON.stringify({ 
          success: true,
          creditsAwarded: creditReward,
          newBalance,
          taskName: task.name,
          badge: task.badge_name
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'claim_badge') {
      if (!lawyerId || !taskKey) {
        return new Response(
          JSON.stringify({ error: 'lawyerId and taskKey are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: task } = await supabase
        .from('gamification_tasks')
        .select('id, badge_name')
        .eq('task_key', taskKey)
        .single();

      if (!task) {
        return new Response(
          JSON.stringify({ error: 'Task not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateError } = await supabase
        .from('gamification_progress')
        .update({
          status: 'claimed',
          claimed_at: new Date().toISOString()
        })
        .eq('lawyer_id', lawyerId)
        .eq('task_id', task.id)
        .eq('status', 'completed');

      if (updateError) {
        console.error('[GAMIFICATION] Error claiming badge:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to claim badge' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          badge: task.badge_name
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GAMIFICATION] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
