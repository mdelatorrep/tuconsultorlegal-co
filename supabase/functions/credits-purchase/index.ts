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

    const { lawyerId, packageId, paymentReference, paymentMethod } = await req.json();

    if (!lawyerId || !packageId) {
      return new Response(
        JSON.stringify({ error: 'lawyerId and packageId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CREDITS-PURCHASE] Processing purchase for lawyer ${lawyerId}, package ${packageId}`);

    // Get package details
    const { data: creditPackage, error: packageError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .eq('is_active', true)
      .single();

    if (packageError || !creditPackage) {
      console.error('[CREDITS-PURCHASE] Package not found:', packageError);
      return new Response(
        JSON.stringify({ error: 'Package not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalCredits = creditPackage.credits + creditPackage.bonus_credits;

    // Get current balance or create record
    let currentBalance = 0;
    let totalEarned = 0;

    const { data: credits, error: creditsError } = await supabase
      .from('lawyer_credits')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .single();

    if (creditsError && creditsError.code !== 'PGRST116') {
      console.error('[CREDITS-PURCHASE] Error fetching credits:', creditsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (credits) {
      currentBalance = credits.current_balance;
      totalEarned = credits.total_earned;
    }

    const newBalance = currentBalance + totalCredits;
    const newTotalEarned = totalEarned + totalCredits;

    // Upsert credits
    const { error: upsertError } = await supabase
      .from('lawyer_credits')
      .upsert({
        lawyer_id: lawyerId,
        current_balance: newBalance,
        total_earned: newTotalEarned,
        last_purchase_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'lawyer_id' });

    if (upsertError) {
      console.error('[CREDITS-PURCHASE] Error updating credits:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to add credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record purchase transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        lawyer_id: lawyerId,
        transaction_type: 'purchase',
        amount: totalCredits,
        balance_after: newBalance,
        reference_type: 'package',
        reference_id: packageId,
        description: `Compra de paquete ${creditPackage.name} (${creditPackage.credits} + ${creditPackage.bonus_credits} bonus)`,
        metadata: {
          package_name: creditPackage.name,
          base_credits: creditPackage.credits,
          bonus_credits: creditPackage.bonus_credits,
          price_cop: creditPackage.price_cop,
          payment_reference: paymentReference,
          payment_method: paymentMethod
        }
      });

    if (transactionError) {
      console.error('[CREDITS-PURCHASE] Error recording transaction:', transactionError);
    }

    // Check if this is first purchase and award gamification
    const { data: firstPurchaseTask } = await supabase
      .from('gamification_tasks')
      .select('id, credit_reward')
      .eq('task_key', 'first_purchase')
      .eq('is_active', true)
      .single();

    if (firstPurchaseTask) {
      const { data: existingProgress } = await supabase
        .from('gamification_progress')
        .select('id, status')
        .eq('lawyer_id', lawyerId)
        .eq('task_id', firstPurchaseTask.id)
        .single();

      if (!existingProgress) {
        // Complete first purchase task
        await supabase.from('gamification_progress').insert({
          lawyer_id: lawyerId,
          task_id: firstPurchaseTask.id,
          status: 'completed',
          completion_count: 1,
          completed_at: new Date().toISOString()
        });

        // Award bonus credits
        const bonusAmount = firstPurchaseTask.credit_reward;
        await supabase
          .from('lawyer_credits')
          .update({ 
            current_balance: newBalance + bonusAmount,
            total_earned: newTotalEarned + bonusAmount
          })
          .eq('lawyer_id', lawyerId);

        await supabase.from('credit_transactions').insert({
          lawyer_id: lawyerId,
          transaction_type: 'gamification',
          amount: bonusAmount,
          balance_after: newBalance + bonusAmount,
          reference_type: 'task',
          reference_id: firstPurchaseTask.id,
          description: 'Bonus: Primera compra completada'
        });
      }
    }

    console.log(`[CREDITS-PURCHASE] Successfully added ${totalCredits} credits. New balance: ${newBalance}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        creditsAdded: totalCredits,
        baseCredits: creditPackage.credits,
        bonusCredits: creditPackage.bonus_credits,
        newBalance,
        packageName: creditPackage.name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CREDITS-PURCHASE] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
