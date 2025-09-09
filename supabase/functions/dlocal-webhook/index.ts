import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the webhook payload from dLocal
    const payload = await req.json();
    console.log('🔔 dLocal webhook received:', payload);

    // Verify webhook signature (implement according to dLocal docs)
    const signature = req.headers.get('x-signature');
    // TODO: Implement signature verification

    // Extract subscription information
    const {
      subscription_id,
      status,
      user_id,
      plan_id,
      amount,
      currency,
      payment_method
    } = payload;

    console.log(`📱 Processing subscription status change: ${status} for subscription ${subscription_id}`);

    // Update the subscription in our database based on status
    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    switch (status) {
      case 'active':
        updateData.status = 'active';
        updateData.current_period_start = new Date().toISOString();
        // Set period end based on billing cycle (get from dLocal or our records)
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
    }

    // Update subscription in database
    const { data: subscription, error: updateError } = await supabase
      .from('lawyer_subscriptions')
      .update(updateData)
      .eq('dlocal_subscription_id', subscription_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating subscription:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If subscription is now active, update lawyer permissions
    if (status === 'active' && subscription) {
      // Get plan details to determine permissions
      const { data: planData } = await supabase.functions.invoke('dlocal-get-plans');
      const activePlan = planData?.data?.find((p: any) => p.id === plan_id);

      if (activePlan) {
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
    }

    // Log the webhook for audit
    await supabase
      .from('security_audit_log')
      .insert({
        event_type: 'dlocal_webhook_received',
        user_identifier: user_id || 'unknown',
        details: {
          subscription_id,
          status,
          plan_id,
          amount,
          currency
        },
        created_at: new Date().toISOString()
      });

    console.log(`✅ Webhook processed successfully for subscription: ${subscription_id}`);

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