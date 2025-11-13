import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'cancel' | 'reactivate';
  subscriptionId: string;
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

    const { action, subscriptionId }: RequestBody = await req.json();
    
    console.log(`Managing subscription ${subscriptionId} for user ${user.id}, action: ${action}`);

    // Get the subscription
    const { data: subscription, error: subError } = await supabase
      .from('lawyer_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('lawyer_id', user.id)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updateData: any = {};

    if (action === 'cancel') {
      // Set to cancel at period end
      updateData = {
        cancel_at_period_end: true
      };
    } else if (action === 'reactivate') {
      // Reactivate subscription
      updateData = {
        cancel_at_period_end: false,
        status: 'active'
      };
    }

    // Update the subscription
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('lawyer_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .eq('lawyer_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Subscription ${action}ed successfully:`, updatedSubscription);

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscription: updatedSubscription,
        message: `Subscription ${action}ed successfully`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in manage-subscription function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});