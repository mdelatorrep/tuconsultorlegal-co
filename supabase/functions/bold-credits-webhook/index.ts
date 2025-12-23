import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Bold credits webhook received:', JSON.stringify(payload, null, 2));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract order info from Bold webhook
    const orderId = payload.order_id || payload.orderId || payload.reference;
    const status = payload.status || payload.payment_status;
    const transactionId = payload.transaction_id || payload.transactionId;

    if (!orderId) {
      console.log('No order ID in webhook payload');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Check if this is a credit purchase order (starts with CREDITS-)
    if (!orderId.startsWith('CREDITS-')) {
      console.log('Not a credit purchase order, ignoring:', orderId);
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log(`Processing credit purchase - Order: ${orderId}, Status: ${status}`);

    // Check if payment was successful
    const isSuccessful = ['APPROVED', 'approved', 'success', 'completed'].includes(status?.toLowerCase());
    
    if (!isSuccessful) {
      console.log(`Payment not successful for order ${orderId}, status: ${status}`);
      return new Response(JSON.stringify({ received: true, processed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Try to get order from credit_purchase_orders table first
    let lawyerId: string | null = null;
    let packageId: string | null = null;
    let credits = 0;

    const { data: purchaseOrder, error: orderError } = await supabase
      .from('credit_purchase_orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (purchaseOrder) {
      lawyerId = purchaseOrder.lawyer_id;
      packageId = purchaseOrder.package_id;
      credits = purchaseOrder.credits;

      // Check if already processed
      if (purchaseOrder.status === 'completed') {
        console.log(`Order ${orderId} already processed, skipping`);
        return new Response(JSON.stringify({ received: true, already_processed: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }

      // Update order status
      await supabase
        .from('credit_purchase_orders')
        .update({ 
          status: 'completed', 
          transaction_id: transactionId,
          completed_at: new Date().toISOString()
        })
        .eq('order_id', orderId);

    } else {
      // Parse order ID to extract lawyer ID: CREDITS-{lawyerId}-{packageId}-{timestamp}
      const parts = orderId.split('-');
      if (parts.length >= 3) {
        lawyerId = parts[1];
        packageId = parts[2];
      }

      if (!lawyerId || !packageId) {
        console.error('Could not parse order ID:', orderId);
        return new Response(JSON.stringify({ error: 'Invalid order ID format' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        });
      }

      // Look up the package to get credits
      const { data: pkg } = await supabase
        .from('credit_packages')
        .select('credits, bonus_credits')
        .eq('id', packageId)
        .single();

      if (pkg) {
        credits = pkg.credits + pkg.bonus_credits;
      }
    }

    if (!lawyerId || credits <= 0) {
      console.error('Missing lawyer ID or credits:', { lawyerId, credits });
      return new Response(JSON.stringify({ error: 'Missing lawyer ID or credits' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Get or create lawyer credit balance
    const { data: existingBalance } = await supabase
      .from('lawyer_credits')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .single();

    const currentBalance = existingBalance?.current_balance || 0;
    const totalEarned = existingBalance?.total_earned || 0;
    const newBalance = currentBalance + credits;

    // Update or insert credit balance
    const { error: balanceError } = await supabase
      .from('lawyer_credits')
      .upsert({
        lawyer_id: lawyerId,
        current_balance: newBalance,
        total_earned: totalEarned + credits,
        last_purchase_at: new Date().toISOString()
      }, {
        onConflict: 'lawyer_id'
      });

    if (balanceError) {
      console.error('Error updating balance:', balanceError);
      throw balanceError;
    }

    // Record the transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        lawyer_id: lawyerId,
        transaction_type: 'purchase',
        amount: credits,
        balance_after: newBalance,
        reference_type: 'bold_payment',
        reference_id: transactionId || orderId,
        description: `Compra de ${credits} créditos (Bold Payment)`
      });

    if (transactionError) {
      console.error('Error recording transaction:', transactionError);
    }

    // Check for first purchase gamification reward
    const { data: existingPurchases } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('lawyer_id', lawyerId)
      .eq('transaction_type', 'purchase')
      .limit(2);

    if (existingPurchases && existingPurchases.length === 1) {
      // This is the first purchase, award bonus
      const { data: firstPurchaseTask } = await supabase
        .from('gamification_tasks')
        .select('id, credit_reward')
        .eq('task_key', 'first_purchase')
        .eq('is_active', true)
        .single();

      if (firstPurchaseTask && firstPurchaseTask.credit_reward > 0) {
        // Award bonus credits
        const bonusBalance = newBalance + firstPurchaseTask.credit_reward;
        
        await supabase
          .from('lawyer_credits')
          .update({
            current_balance: bonusBalance,
            total_earned: totalEarned + credits + firstPurchaseTask.credit_reward
          })
          .eq('lawyer_id', lawyerId);

        await supabase
          .from('credit_transactions')
          .insert({
            lawyer_id: lawyerId,
            transaction_type: 'bonus',
            amount: firstPurchaseTask.credit_reward,
            balance_after: bonusBalance,
            reference_type: 'gamification',
            reference_id: firstPurchaseTask.id,
            description: '¡Bonus por primera compra!'
          });

        console.log(`First purchase bonus awarded: ${firstPurchaseTask.credit_reward} credits`);
      }
    }

    console.log(`Successfully credited ${credits} to lawyer ${lawyerId}. New balance: ${newBalance}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        credits_added: credits,
        new_balance: newBalance 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error processing credit webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
