import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
}

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

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { planId, billingCycle }: RequestBody = await req.json();
    
    console.log(`Creating subscription for user ${user.id}, plan ${planId}, cycle ${billingCycle}`);

    // Get the plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For now, create a simple subscription record without dLocal integration
    // In a real implementation, you would integrate with dLocal API here
    const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
    
    // Check if user already has an active subscription
    const { data: existingSubscription } = await supabase
      .from('lawyer_subscriptions')
      .select('*')
      .eq('lawyer_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      return new Response(
        JSON.stringify({ error: 'User already has an active subscription' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create subscription record
    const { data: subscription, error: subscriptionError } = await supabase
      .from('lawyer_subscriptions')
      .insert({
        lawyer_id: user.id,
        plan_id: planId,
        billing_cycle: billingCycle,
        status: price === 0 ? 'active' : 'pending', // Free plans are active immediately
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If it's a free plan, update lawyer permissions immediately
    if (price === 0) {
      await supabase
        .from('lawyer_profiles')
        .update({
          can_create_agents: plan.enables_legal_tools ? true : false,
          can_create_blogs: plan.enables_legal_tools ? true : false,
          can_use_ai_tools: plan.enables_legal_tools
        })
        .eq('id', user.id);
    }

    console.log(`Subscription created successfully:`, subscription);

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscription,
        message: price === 0 ? 'Free plan activated successfully' : 'Subscription created, payment required'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in create-subscription function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});