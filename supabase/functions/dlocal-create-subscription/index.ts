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

    // Get dLocal API credentials
    const apiKey = Deno.env.get('DLOCAL_API_KEY');
    const secretKey = Deno.env.get('DLOCAL_SECRET_KEY');

    if (!apiKey || !secretKey) {
      return new Response(
        JSON.stringify({ error: 'dLocal credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Base URLs for callbacks
    const baseUrl = 'https://ebc42f7b-d0e5-428f-849a-2403f4cd72c2.sandbox.lovable.dev';
    
    // Prepare subscription data for dLocal
    const subscriptionData = {
      plan_id: planId,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email
      },
      // Configure the important callback URLs
      notification_url: `https://tkaezookvtpulfpaffes.supabase.co/functions/v1/dlocal-webhook`,
      success_url: `${baseUrl}/subscription-success?subscription_id={subscription_id}&plan_name={plan_name}`,
      back_url: `${baseUrl}/#abogados?tab=subscription`,
      error_url: `${baseUrl}/subscription-error?error={error}&error_description={error_description}`
    };

    // Call dLocal API to create subscription
    const auth = btoa(`${apiKey}:${secretKey}`);
    
    console.log('🔗 Calling dLocal API with data:', JSON.stringify(subscriptionData, null, 2));
    
    const dLocalResponse = await fetch('https://api.dlocalgo.com/v1/subscription/create', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData)
    });

    console.log('📡 dLocal API response status:', dLocalResponse.status);
    
    if (!dLocalResponse.ok) {
      console.error('❌ dLocal API error:', dLocalResponse.status, dLocalResponse.statusText);
      const errorText = await dLocalResponse.text();
      console.error('❌ Error details:', errorText);
      
      // For now, let's redirect directly to the plan's subscribe_url as fallback
      console.log('🔄 Falling back to direct plan subscribe_url');
      
      // Get the plan from our dlocal-get-plans to get the subscribe_url
      const { data: plansData, error: plansError } = await supabase.functions.invoke('dlocal-get-plans');
      
      if (!plansError && plansData?.data) {
        const selectedPlan = plansData.data.find((p: any) => p.id == planId);
        if (selectedPlan?.subscribe_url) {
          console.log('✅ Using plan subscribe_url:', selectedPlan.subscribe_url);
          return new Response(
            JSON.stringify({ 
              success: true, 
              redirectUrl: selectedPlan.subscribe_url,
              message: 'Redirecting to plan subscription page'
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription with dLocal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dLocalResult = await dLocalResponse.json();
    console.log('dLocal subscription response:', dLocalResult);

    // Save subscription record in our database
    const { data: subscription, error: subscriptionError } = await supabase
      .from('lawyer_subscriptions')
      .insert({
        lawyer_id: user.id,
        plan_id: planId,
        billing_cycle: billingCycle,
        status: 'pending', // Will be updated via webhook
        dlocal_subscription_id: dLocalResult.subscription_id,
        cancel_at_period_end: false
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Error creating subscription record:', subscriptionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Subscription created successfully:`, subscription);

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscription,
        redirectUrl: dLocalResult.redirect_url || dLocalResult.checkout_url,
        message: 'Subscription created, redirecting to payment'
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