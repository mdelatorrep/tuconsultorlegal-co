import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`🌐 Webhook request received: ${req.method} ${req.url}`);
  console.log('📋 Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the webhook payload from dLocal
    const payload = await req.json();
    console.log('🔔 dLocal webhook received:', JSON.stringify(payload, null, 2));

    // Verify webhook signature (implement according to dLocal docs)
    const signature = req.headers.get('x-signature');
    // TODO: Implement signature verification

    // Extract subscription information from dLocal payload
    const subscriptionId = payload.subscription?.id || payload.id;
    const status = payload.subscription?.status || payload.status;
    const userEmail = payload.subscription?.user?.email || payload.user?.email;
    const planId = payload.subscription?.plan_id || payload.plan_id;
    const amount = payload.subscription?.amount || payload.amount;
    const currency = payload.subscription?.currency || payload.currency;
    
    console.log(`📱 Processing subscription: ${subscriptionId}, status: ${status}, email: ${userEmail}`);

    if (!subscriptionId) {
      console.error('❌ No subscription ID found in payload');
      return new Response(
        JSON.stringify({ error: 'Missing subscription ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, try to find the lawyer by email
    let lawyerId = null;
    if (userEmail) {
      const { data: lawyer } = await supabase
        .from('lawyer_profiles')
        .select('id')
        .eq('email', userEmail)
        .single();
      
      if (lawyer) {
        lawyerId = lawyer.id;
        console.log(`✅ Found lawyer: ${lawyerId} for email: ${userEmail}`);
      } else {
        console.log(`⚠️ No lawyer found for email: ${userEmail}`);
      }
    }

    // Update the subscription in our database based on status
    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    switch (status) {
      case 'active':
        updateData.status = 'active';
        updateData.current_period_start = new Date().toISOString();
        // Set period end to 30 days from now for monthly billing
        updateData.current_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'cancelled':
        updateData.status = 'cancelled';
        break;
      case 'expired':
        updateData.status = 'expired';
        break;
      case 'pending':
        updateData.status = 'pending';
        break;
      default:
        console.log(`⚠️ Unknown subscription status: ${status}`);
        updateData.status = status; // Store whatever status we received
    }

    // Try to update existing subscription first
    const { data: existingSubscription, error: updateError } = await supabase
      .from('lawyer_subscriptions')
      .update(updateData)
      .eq('dlocal_subscription_id', subscriptionId)
      .select()
      .single();

    let subscription = existingSubscription;

    // If no existing subscription found, create a new one
    if (updateError && updateError.code === 'PGRST116' && lawyerId) {
      console.log(`📝 Creating new subscription for lawyer ${lawyerId}`);
      const { data: newSubscription, error: insertError } = await supabase
        .from('lawyer_subscriptions')
        .insert({
          lawyer_id: lawyerId,
          plan_id: planId || 'premium',
          billing_cycle: 'monthly',
          status: updateData.status,
          dlocal_subscription_id: subscriptionId,
          current_period_start: updateData.current_period_start,
          current_period_end: updateData.current_period_end,
          cancel_at_period_end: false
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating subscription:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      subscription = newSubscription;
      console.log(`✅ Created new subscription: ${subscription.id}`);
    }

    if (updateError && updateError.code !== 'PGRST116') {
      console.error('❌ Error updating subscription:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If subscription is now active, update lawyer permissions
    if (status === 'active' && subscription && subscription.lawyer_id) {
      await supabase
        .from('lawyer_profiles')
        .update({
          can_create_agents: true,
          can_create_blogs: true,
          can_use_ai_tools: true
        })
        .eq('id', subscription.lawyer_id);

      console.log(`✅ Updated permissions for lawyer: ${subscription.lawyer_id}`);
    }

    // Log the webhook for audit
    await supabase
      .from('security_audit_log')
      .insert({
        event_type: 'dlocal_webhook_received',
        user_identifier: userEmail || 'unknown',
        details: {
          subscription_id: subscriptionId,
          status,
          plan_id: planId,
          amount,
          currency,
          lawyer_id: subscription?.lawyer_id
        },
        created_at: new Date().toISOString()
      });

    console.log(`✅ Webhook processed successfully for subscription: ${subscriptionId}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Error processing dLocal webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});