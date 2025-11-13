import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
};

const verifyDLocalSignature = async (payload: string, signature: string, secret: string): Promise<boolean> => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  const computedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  return signature === computedSignature;
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

    // Get raw body and signature for verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature');
    const secret = Deno.env.get('DLOCAL_SECRET_KEY');

    // Verify webhook signature
    if (!signature || !secret) {
      console.error('❌ Missing signature or secret key');
      return new Response(
        JSON.stringify({ error: 'Missing signature or secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isValidSignature = await verifyDLocalSignature(rawBody, signature, secret);
    if (!isValidSignature) {
      console.error('❌ Invalid webhook signature');
      await supabase
        .from('security_audit_log')
        .insert({
          event_type: 'dlocal_webhook_invalid_signature',
          user_identifier: 'unknown',
          details: { signature, timestamp: new Date().toISOString() },
          created_at: new Date().toISOString()
        });
      
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Webhook signature verified');

    // Parse the verified webhook payload
    const payload = JSON.parse(rawBody);
    console.log('🔔 dLocal webhook received:', JSON.stringify(payload, null, 2));

    // Extract subscription information from dLocal payload - handle multiple payload formats
    const subscriptionId = payload.subscription_id || payload.subscription?.id || payload.id;
    const status = payload.status || payload.subscription?.status;
    const userEmail = payload.user?.email || payload.subscription?.user?.email || payload.email;
    const externalId = payload.user?.external_id || payload.external_id;
    const planId = payload.plan_id || payload.subscription?.plan_id;
    const amount = payload.amount || payload.subscription?.amount;
    const currency = payload.currency || payload.subscription?.currency;
    
    console.log(`📱 Processing subscription: ${subscriptionId}, status: ${status}, email: ${userEmail}`);

    if (!subscriptionId) {
      console.error('❌ No subscription ID found in payload');
      return new Response(
        JSON.stringify({ error: 'Missing subscription ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, try to find the lawyer by external_id (preferred) or email
    let lawyerId = null;
    
    // Try external_id first (most reliable for linking)
    if (externalId) {
      const { data: lawyer } = await supabase
        .from('lawyer_profiles')
        .select('id, email')
        .eq('id', externalId)
        .maybeSingle();
      
      if (lawyer) {
        lawyerId = lawyer.id;
        console.log(`✅ Found lawyer by external_id: ${lawyerId} (${lawyer.email})`);
      } else {
        console.log(`⚠️ No lawyer found for external_id: ${externalId}`);
      }
    }
    
    // Fallback to email if external_id didn't work
    if (!lawyerId && userEmail) {
      const { data: lawyer } = await supabase
        .from('lawyer_profiles')
        .select('id')
        .eq('email', userEmail)
        .maybeSingle();
      
      if (lawyer) {
        lawyerId = lawyer.id;
        console.log(`✅ Found lawyer by email: ${lawyerId} for email: ${userEmail}`);
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
    let { data: existingSubscription, error: updateError } = await supabase
      .from('lawyer_subscriptions')
      .update(updateData)
      .eq('dlocal_subscription_id', subscriptionId)
      .select()
      .single();
    
    // If no subscription found by dlocal_subscription_id, try by lawyer_id for pending subscriptions
    if (updateError && updateError.code === 'PGRST116' && lawyerId) {
      console.log(`🔍 No subscription found by dlocal_subscription_id, trying by lawyer_id for pending...`);
      const { data: pendingSubscription, error: pendingError } = await supabase
        .from('lawyer_subscriptions')
        .update({
          ...updateData,
          dlocal_subscription_id: subscriptionId
        })
        .eq('lawyer_id', lawyerId)
        .eq('status', 'pending')
        .is('dlocal_subscription_id', null)
        .select()
        .single();
      
      if (!pendingError && pendingSubscription) {
        existingSubscription = pendingSubscription;
        updateError = null;
        console.log(`✅ Updated pending subscription: ${pendingSubscription.id}`);
      }
    }

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