import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    if (action === 'get_progress') {
      // Get all tasks and progress for a lawyer
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
            completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
          },
          badges: earnedBadges
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'complete_task') {
      // Mark a task as completed
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

      const newBalance = (credits?.current_balance || 0) + task.credit_reward;
      const newTotalEarned = (credits?.total_earned || 0) + task.credit_reward;

      await supabase.from('lawyer_credits').upsert({
        lawyer_id: lawyerId,
        current_balance: newBalance,
        total_earned: newTotalEarned,
        updated_at: now
      }, { onConflict: 'lawyer_id' });

      await supabase.from('credit_transactions').insert({
        lawyer_id: lawyerId,
        transaction_type: 'gamification',
        amount: task.credit_reward,
        balance_after: newBalance,
        reference_type: 'task',
        reference_id: task.id,
        description: `Tarea completada: ${task.name}`
      });

      console.log(`[GAMIFICATION] Task ${taskKey} completed. Awarded ${task.credit_reward} credits`);

      return new Response(
        JSON.stringify({ 
          success: true,
          creditsAwarded: task.credit_reward,
          newBalance,
          taskName: task.name,
          badge: task.badge_name
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'claim_badge') {
      // Claim a badge after task completion
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
