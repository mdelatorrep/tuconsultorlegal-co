import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { lawyer_id, module_name, action, completion_percentage, score, ai_question } = await req.json();

    if (!lawyer_id) {
      throw new Error('lawyer_id is required');
    }

    let { data: progress, error: fetchError } = await supabase
      .from('lawyer_training_progress')
      .select('*')
      .eq('lawyer_id', lawyer_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (!progress) {
      const { data: newProgress, error: createError } = await supabase
        .from('lawyer_training_progress')
        .insert({
          lawyer_id,
          modules_completed: [],
          completion_percentage: 0,
          ai_questions_count: 0,
          training_streak: 0,
          best_score: 0,
          total_xp_earned: 0
        })
        .select()
        .single();

      if (createError) throw createError;
      progress = newProgress;
    }

    let updatedModules = progress.modules_completed || [];
    let updatedPercentage = progress.completion_percentage || 0;
    let aiQuestionsCount = progress.ai_questions_count || 0;
    let trainingStreak = progress.training_streak || 0;
    let lastTrainingDate = progress.last_training_date;
    let bestScore = progress.best_score || 0;
    let totalXpEarned = progress.total_xp_earned || 0;
    let gamificationRewards: any[] = [];

    const today = new Date().toISOString().split('T')[0];

    // Update streak
    if (lastTrainingDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastTrainingDate === yesterdayStr) {
        trainingStreak += 1;
      } else if (lastTrainingDate !== today) {
        trainingStreak = 1;
      }
      lastTrainingDate = today;
    }

    // Handle different actions
    if (action === 'complete_module' && module_name) {
      if (!updatedModules.includes(module_name)) {
        updatedModules.push(module_name);
        const totalModules = 5;
        updatedPercentage = Math.round((updatedModules.length / totalModules) * 100);
        
        // Award XP for completing module
        const moduleXP = 25;
        totalXpEarned += moduleXP;

        // Trigger gamification rewards
        if (updatedModules.length === 1) {
          gamificationRewards.push({ task_key: 'complete_first_module', xp: 15 });
        }
        if (updatedModules.length === 3) {
          gamificationRewards.push({ task_key: 'complete_3_modules', xp: 30 });
        }
        if (score && score >= 100 && score > bestScore) {
          gamificationRewards.push({ task_key: 'perfect_module_score', xp: 20 });
          bestScore = score;
        }
      }
    } else if (action === 'start_training') {
      gamificationRewards.push({ task_key: 'start_training', xp: 5 });
    } else if (action === 'ai_question') {
      aiQuestionsCount += 1;
      if (aiQuestionsCount === 5) {
        gamificationRewards.push({ task_key: 'ask_ai_assistant_5', xp: 10 });
      }
      if (aiQuestionsCount === 20) {
        gamificationRewards.push({ task_key: 'ask_ai_assistant_20', xp: 25 });
      }
    } else if (action === 'set_percentage' && completion_percentage !== undefined) {
      updatedPercentage = completion_percentage;
    }

    // Check streak rewards
    if (trainingStreak === 3) {
      gamificationRewards.push({ task_key: 'training_streak_3', xp: 10 });
    }
    if (trainingStreak === 7) {
      gamificationRewards.push({ task_key: 'training_streak_7', xp: 25 });
    }

    const is_certified = updatedPercentage >= 100;
    const completed_at = is_certified && !progress.completed_at ? new Date().toISOString() : progress.completed_at;

    if (is_certified && !progress.is_certified) {
      gamificationRewards.push({ task_key: 'complete_certification', xp: 100 });
    }

    // Update progress
    const { data: updatedProgress, error: updateError } = await supabase
      .from('lawyer_training_progress')
      .update({
        modules_completed: updatedModules,
        completion_percentage: updatedPercentage,
        is_certified,
        completed_at,
        ai_questions_count: aiQuestionsCount,
        training_streak: trainingStreak,
        last_training_date: lastTrainingDate,
        best_score: bestScore,
        total_xp_earned: totalXpEarned
      })
      .eq('id', progress.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Process gamification rewards
    for (const reward of gamificationRewards) {
      try {
        const { data: task } = await supabase
          .from('gamification_tasks')
          .select('id, credit_reward')
          .eq('task_key', reward.task_key)
          .single();

        if (task) {
          await supabase.from('gamification_progress').upsert({
            lawyer_id,
            task_id: task.id,
            status: 'completed',
            completion_count: 1,
            completed_at: new Date().toISOString()
          }, { onConflict: 'lawyer_id,task_id' });
        }
      } catch (e) {
        console.error(`Error processing reward ${reward.task_key}:`, e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        progress: updatedProgress,
        rewards: gamificationRewards,
        message: is_certified ? '¡Certificación completada!' : 'Progreso actualizado'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error updating training progress:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error updating training progress' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});