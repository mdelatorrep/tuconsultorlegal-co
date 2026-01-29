import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Get multiple configs at once - throws if any required config is missing
async function getRequiredConfigs(supabase: any, keys: string[]): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('system_config')
    .select('config_key, config_value')
    .in('config_key', keys);
  
  if (error) {
    throw new Error(`Failed to fetch configurations: ${error.message}`);
  }
  
  const result: Record<string, string> = {};
  data?.forEach((item: any) => {
    result[item.config_key] = item.config_value;
  });
  
  // Validate all required configs are present
  const missingConfigs = keys.filter(key => !result[key]);
  if (missingConfigs.length > 0) {
    throw new Error(`Missing required configurations: ${missingConfigs.join(', ')}. Please configure them in the admin panel.`);
  }
  
  return result;
}

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

    // Get all gamification configs from system_config
    const { data: allConfigs, error: configError } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .or('config_key.like.gamification_%');
    
    if (configError) {
      throw new Error(`Failed to fetch gamification configurations: ${configError.message}`);
    }
    
    const configMap: Record<string, any> = {};
    allConfigs?.forEach((item: any) => {
      configMap[item.config_key] = item.config_value;
    });

    const gamificationEnabled = configMap['gamification_enabled'] !== 'false' && configMap['gamification_enabled'] !== false;
    
    if (!gamificationEnabled) {
      return new Response(
        JSON.stringify({ error: 'Gamification is disabled', disabled: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const streakMultiplier = parseFloat(configMap['gamification_streak_bonus_multiplier'] || '1.5');
    const dailyGoal = parseInt(configMap['gamification_daily_goal_credits'] || '10');
    
    // Build pointsConfig from individual system_config keys
    const pointsConfig: Record<string, number> = {
      document_analysis: parseInt(configMap['gamification_points_document_analysis'] || '10'),
      research: parseInt(configMap['gamification_points_research'] || '15'),
      strategy: parseInt(configMap['gamification_points_strategy'] || '20'),
      draft: parseInt(configMap['gamification_points_draft'] || '25'),
      case_prediction: parseInt(configMap['gamification_points_case_prediction'] || '15'),
      client_added: parseInt(configMap['gamification_points_client_added'] || '5'),
      case_won: parseInt(configMap['gamification_points_case_won'] || '100'),
      first_login: parseInt(configMap['gamification_points_first_login'] || '5'),
      profile_complete: parseInt(configMap['gamification_points_profile_complete'] || '20'),
      training_module: parseInt(configMap['gamification_points_training_module'] || '30'),
      daily_login: parseInt(configMap['gamification_points_daily_login'] || '1'),
      daily_tool_use: parseInt(configMap['gamification_points_daily_tool_use'] || '2'),
      referral: parseInt(configMap['gamification_points_referral'] || '50'),
      first_purchase: parseInt(configMap['gamification_points_first_purchase'] || '10'),
      process_query: parseInt(configMap['gamification_points_process_query'] || '5'),
      copilot_use: parseInt(configMap['gamification_points_copilot_use'] || '3'),
      crm_ai: parseInt(configMap['gamification_points_crm_ai'] || '10')
    };
    
    let levels: any[] = [];
    try {
      levels = JSON.parse(configMap['gamification_levels'] || '[]');
    } catch (e) {
      console.error('[GAMIFICATION] Error parsing levels JSON:', e);
      levels = [{ level: 1, name: 'Novato', minCredits: 0, badge: '🌱' }];
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

    // Handle 'claim' action - combines complete_task + claim_badge in one step
    if (action === 'claim') {
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
            JSON.stringify({ 
              error: 'Task already claimed today', 
              alreadyClaimed: true,
              claimed: false
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // For one-time tasks, check if already claimed
      if (task.task_type === 'onetime' && existingProgress?.status === 'claimed') {
        return new Response(
          JSON.stringify({ 
            error: 'Task already claimed', 
            alreadyClaimed: true,
            claimed: false
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        description: `Misión completada: ${task.name}`
      });

      console.log(`[GAMIFICATION] Task ${taskKey} claimed. Awarded ${creditReward} credits to lawyer ${lawyerId}`);

      return new Response(
        JSON.stringify({ 
          success: true,
          claimed: true,
          creditsAwarded: creditReward,
          newBalance,
          taskName: task.name,
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
