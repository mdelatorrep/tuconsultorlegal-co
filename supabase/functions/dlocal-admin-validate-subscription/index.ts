import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    const { subscriptionId } = await req.json();
    
    console.log(`Validating subscription ${subscriptionId} for user ${user.id}`);

    // Get dLocal API credentials
    const apiKey = Deno.env.get('DLOCAL_API_KEY');
    const secretKey = Deno.env.get('DLOCAL_SECRET_KEY');

    if (!apiKey || !secretKey) {
      return new Response(
        JSON.stringify({ error: 'dLocal credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check subscription status with dLocal
    const auth = btoa(`${apiKey}:${secretKey}`);
    
    const dLocalResponse = await fetch(`https://api.dlocalgo.com/v1/subscription/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      }
    });

    if (!dLocalResponse.ok) {
      console.error('❌ dLocal API error:', dLocalResponse.status, dLocalResponse.statusText);
      const errorText = await dLocalResponse.text();
      console.error('❌ Error details:', errorText);
      
      return new Response(
        JSON.stringify({ error: 'Failed to validate subscription with dLocal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subscriptionData = await dLocalResponse.json();
    console.log('dLocal subscription data:', subscriptionData);

    // Update local subscription record
    const { data: localSubscription, error: updateError } = await supabase
      .from('lawyer_subscriptions')
      .update({
        status: subscriptionData.status.toLowerCase(),
        current_period_start: subscriptionData.current_period_start,
        current_period_end: subscriptionData.current_period_end,
        updated_at: new Date().toISOString()
      })
      .eq('dlocal_subscription_id', subscriptionId)
      .eq('lawyer_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating subscription record:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update lawyer permissions if subscription is active
    if (subscriptionData.status.toLowerCase() === 'active') {
      const { error: permissionError } = await supabase
        .from('lawyer_profiles')
        .update({
          can_use_ai_tools: true,
          can_create_agents: true,
          can_create_blogs: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (permissionError) {
        console.error('Error updating lawyer permissions:', permissionError);
      }
    }

    console.log(`Subscription validation completed for user ${user.id}:`, localSubscription);

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscription: localSubscription,
        dlocal_data: subscriptionData,
        message: 'Subscription validated and updated successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in validate-subscription function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});