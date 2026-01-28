import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Check and update gamification progress for tool usage
async function updateGamificationProgress(supabase: any, lawyerId: string, toolType: string) {
  try {
    console.log(`[GAMIFICATION] Checking tasks for tool: ${toolType}`);

    // Get all active tasks that match this tool_type
    const { data: tasks, error: tasksError } = await supabase
      .from('gamification_tasks')
      .select('*')
      .eq('is_active', true);

    if (tasksError || !tasks) {
      console.error('[GAMIFICATION] Error fetching tasks:', tasksError);
      return;
    }

    const parseCriteria = (raw: unknown): any => {
      if (!raw) return null;
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
      return raw;
    };

    const getCriteriaToolType = (criteria: any): string | null => {
      if (!criteria) return null;
      return (criteria.tool_type ?? criteria.toolType ?? null) as string | null;
    };

    // Filter tasks that match this tool_type (robust to jsonb parsing differences)
    const matchingTasks = tasks.filter((task: any) => {
      const criteria = parseCriteria(task.completion_criteria);
      const allTools = criteria?.all_tools === true;
      const criteriaToolType = getCriteriaToolType(criteria);
      return allTools || criteriaToolType === toolType;
    });

    if (matchingTasks.length === 0) {
      console.log(`[GAMIFICATION] No matching tasks for tool_type: ${toolType}`);
      return;
    }

    console.log(`[GAMIFICATION] Found ${matchingTasks.length} matching tasks`);

    // Count total uses of this tool by this lawyer (legacy heuristic)
    await supabase
      .from('credit_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('lawyer_id', lawyerId)
      .eq('transaction_type', 'usage')
      .eq('reference_type', 'tool')
      .ilike('description', `%${toolType}%`);

    // Better approach: count by tool_type in metadata or tool_costs join
    const { data: allTransactions } = await supabase
      .from('credit_transactions')
      .select('id, reference_id')
      .eq('lawyer_id', lawyerId)
      .eq('transaction_type', 'usage')
      .eq('reference_type', 'tool');

    // Get tool cost id for this tool type
    const { data: toolCost } = await supabase
      .from('credit_tool_costs')
      .select('id')
      .eq('tool_type', toolType)
      .single();

    const usesOfThisTool = allTransactions?.filter((t: any) => t.reference_id === toolCost?.id).length || 0;
    const totalToolUses = allTransactions?.length || 0;

    console.log(`[GAMIFICATION] Lawyer has ${usesOfThisTool} uses of ${toolType}`);

    for (const task of matchingTasks) {
      const criteria = parseCriteria(task.completion_criteria) || {};
      const minUses = criteria?.min_uses || 1;
      const today = new Date().toISOString().split('T')[0];

      const appliesToAllTools = criteria?.all_tools === true;
      const currentCount = appliesToAllTools ? totalToolUses : usesOfThisTool;

      // Get existing progress
      const { data: existingProgress } = await supabase
        .from('gamification_progress')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .eq('task_id', task.id)
        .single();

      // For daily tasks, check if completed today
      if (task.task_type === 'daily') {
        const lastCompleted = existingProgress?.completed_at?.split('T')[0];
        
        if (lastCompleted === today) {
          console.log(`[GAMIFICATION] Daily task ${task.task_key} already completed today`);
          continue;
        }

        // Only complete if min uses reached
        if (currentCount >= minUses) {
          await completeDailyTask(supabase, lawyerId, task, existingProgress, { currentCount, minUses, toolType });
        }
      }
      // For weekly tasks, check if completed this week
      else if (task.task_type === 'weekly') {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const lastCompleted = existingProgress?.completed_at ? new Date(existingProgress.completed_at) : null;
        
        if (lastCompleted && lastCompleted >= startOfWeek) {
          console.log(`[GAMIFICATION] Weekly task ${task.task_key} already completed this week`);
          continue;
        }

        if (currentCount >= minUses) {
          await completeDailyTask(supabase, lawyerId, task, existingProgress, { currentCount, minUses, toolType });
        }
      }
      // For achievements, check if min_uses reached
      else if (task.task_type === 'achievement') {
        if (existingProgress?.status === 'completed' || existingProgress?.status === 'claimed') {
          console.log(`[GAMIFICATION] Achievement ${task.task_key} already completed`);
          continue;
        }

        if (currentCount >= minUses) {
          console.log(`[GAMIFICATION] Achievement ${task.task_key} unlocked! (${currentCount}/${minUses})`);
          await completeAchievement(supabase, lawyerId, task);
        } else {
          // Update progress data for achievement
          await supabase
            .from('gamification_progress')
            .upsert({
              lawyer_id: lawyerId,
              task_id: task.id,
              status: 'in_progress',
              completion_count: currentCount,
              progress_data: { current: currentCount, target: minUses },
              started_at: existingProgress?.started_at || new Date().toISOString()
            }, { onConflict: 'lawyer_id,task_id' });
        }
      }
    }
  } catch (error) {
    console.error('[GAMIFICATION] Error updating progress:', error);
    // Don't fail the main credit consumption
  }
}

async function completeDailyTask(
  supabase: any,
  lawyerId: string,
  task: any,
  existingProgress: any,
  meta?: { currentCount: number; minUses: number; toolType: string }
) {
  const now = new Date().toISOString();
  const completionCount = (existingProgress?.completion_count || 0) + 1;

  // Upsert progress
  const { error: upsertError } = await supabase
    .from('gamification_progress')
    .upsert({
      lawyer_id: lawyerId,
      task_id: task.id,
      status: 'completed',
      completion_count: completionCount,
      progress_data: {
        current: meta?.currentCount ?? 1,
        target: meta?.minUses ?? 1,
        toolType: meta?.toolType,
      },
      completed_at: now,
      started_at: existingProgress?.started_at || now
    }, { onConflict: 'lawyer_id,task_id' });

  if (upsertError) {
    console.error('[GAMIFICATION] Error upserting progress:', upsertError);
    return;
  }

  // Send notification (credits are awarded on CLAIM via gamification-check)
  await sendGamificationNotification(supabase, lawyerId, task);
}

async function completeAchievement(supabase: any, lawyerId: string, task: any) {
  const now = new Date().toISOString();

  const { error: upsertError } = await supabase
    .from('gamification_progress')
    .upsert({
      lawyer_id: lawyerId,
      task_id: task.id,
      status: 'completed',
      completion_count: 1,
      progress_data: { current: task.completion_criteria?.min_uses || 1, target: task.completion_criteria?.min_uses || 1 },
      completed_at: now,
      started_at: now
    }, { onConflict: 'lawyer_id,task_id' });

  if (upsertError) {
    console.error('[GAMIFICATION] Error completing achievement:', upsertError);
    return;
  }

  // Credits are awarded on CLAIM via gamification-check
  await sendGamificationNotification(supabase, lawyerId, task, true);
}

async function sendGamificationNotification(supabase: any, lawyerId: string, task: any, isAchievement = false) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const title = isAchievement 
      ? `🏆 ¡Logro desbloqueado: ${task.badge_name || task.name}!`
      : `✅ ¡Misión completada: ${task.name}!`;
    
    const message = isAchievement
      ? `Felicitaciones, has desbloqueado el logro "${task.badge_name || task.name}". Reclama tu recompensa de ${task.credit_reward} créditos en Misiones.`
      : `Has completado la misión "${task.name}". Reclama tu recompensa de ${task.credit_reward} créditos en Misiones.`;

    await fetch(`${supabaseUrl}/functions/v1/create-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        lawyer_id: lawyerId,
        notification_type: 'gamification',
        title,
        message,
        entity_type: 'gamification_task',
        entity_id: task.id,
        priority: isAchievement ? 'high' : 'normal'
      })
    });

    console.log(`[GAMIFICATION] Notification sent for ${task.name}`);
  } catch (error) {
    console.error('[GAMIFICATION] Error sending notification:', error);
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

    const { lawyerId, toolType, metadata } = await req.json();

    if (!lawyerId || !toolType) {
      return new Response(
        JSON.stringify({ error: 'lawyerId and toolType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CREDITS] Consuming credits for lawyer ${lawyerId}, tool: ${toolType}`);

    // Get tool cost including gamification settings
    const { data: toolCost, error: toolError } = await supabase
      .from('credit_tool_costs')
      .select('*')
      .eq('tool_type', toolType)
      .eq('is_active', true)
      .single();

    if (toolError || !toolCost) {
      console.error('[CREDITS] Tool not found:', toolError);
      return new Response(
        JSON.stringify({ error: 'Tool type not found or inactive', allowed: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const creditCost = toolCost.credit_cost;
    const gamificationEnabled = toolCost.gamification_enabled ?? true;
    const gamificationReward = toolCost.gamification_reward ?? 0;

    // Get current balance
    const { data: credits, error: creditsError } = await supabase
      .from('lawyer_credits')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .single();

    if (creditsError) {
      // If no credits record, create one with 0 balance
      if (creditsError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('lawyer_credits')
          .insert({ lawyer_id: lawyerId, current_balance: 0, total_earned: 0, total_spent: 0 });
        
        if (insertError) {
          console.error('[CREDITS] Error creating credits record:', insertError);
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient credits', 
            allowed: false,
            currentBalance: 0,
            required: creditCost,
            toolName: toolCost.tool_name
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.error('[CREDITS] Error fetching credits:', creditsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentBalance = credits?.current_balance || 0;

    // Check if sufficient balance
    if (currentBalance < creditCost) {
      console.log(`[CREDITS] Insufficient balance: ${currentBalance} < ${creditCost}`);
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credits', 
          allowed: false,
          currentBalance,
          required: creditCost,
          toolName: toolCost.tool_name
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct credits
    const newBalance = currentBalance - creditCost;
    const newTotalSpent = (credits?.total_spent || 0) + creditCost;

    const { error: updateError } = await supabase
      .from('lawyer_credits')
      .update({ 
        current_balance: newBalance, 
        total_spent: newTotalSpent,
        updated_at: new Date().toISOString()
      })
      .eq('lawyer_id', lawyerId);

    if (updateError) {
      console.error('[CREDITS] Error updating credits:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to deduct credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        lawyer_id: lawyerId,
        transaction_type: 'usage',
        amount: -creditCost,
        balance_after: newBalance,
        reference_type: 'tool',
        reference_id: toolCost.id,
        description: `Uso de ${toolCost.tool_name}`,
        metadata: metadata || {}
      });

    if (transactionError) {
      console.error('[CREDITS] Error recording transaction:', transactionError);
    }

    console.log(`[CREDITS] Successfully consumed ${creditCost} credits. New balance: ${newBalance}`);

    // Prepare gamification response data
    let gamificationData = null;
    
    // Only process gamification if enabled for this tool
    if (gamificationEnabled && gamificationReward > 0) {
      console.log(`[CREDITS] Gamification enabled for ${toolType}, potential reward: ${gamificationReward}`);
      await updateGamificationProgress(supabase, lawyerId, toolType);
      
      // Check if any task was completed and include in response for UI celebration
      gamificationData = {
        enabled: true,
        potentialReward: gamificationReward,
        toolType
      };
    } else {
      console.log(`[CREDITS] Gamification disabled for ${toolType}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        allowed: true,
        creditsUsed: creditCost,
        newBalance,
        toolName: toolCost.tool_name,
        // Include gamification data for frontend celebration effect
        gamification: gamificationData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CREDITS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
