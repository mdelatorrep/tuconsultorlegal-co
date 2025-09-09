import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModifySubscriptionData {
  subscriptionId: string;
  action: 'change_plan' | 'cancel' | 'pause' | 'resume';
  planId?: string;
  prorate?: boolean;
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

    // Verify admin authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin permissions
    const { data: adminProfile, error: adminError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .single();

    if (adminError || !adminProfile) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const modifyData: ModifySubscriptionData = await req.json();
    
    console.log('Modifying dLocal subscription:', modifyData);

    let dlocalResponse;
    let endpoint = '';
    let method = '';
    let body: any = {};

    switch (modifyData.action) {
      case 'change_plan':
        endpoint = `https://api.dlocalgo.com/v1/subscriptions/${modifyData.subscriptionId}/plan`;
        method = 'PUT';
        body = {
          plan_id: modifyData.planId,
          prorate: modifyData.prorate || true
        };
        break;
      
      case 'cancel':
        endpoint = `https://api.dlocalgo.com/v1/subscriptions/${modifyData.subscriptionId}`;
        method = 'DELETE';
        break;
      
      case 'pause':
        endpoint = `https://api.dlocalgo.com/v1/subscriptions/${modifyData.subscriptionId}/pause`;
        method = 'POST';
        break;
      
      case 'resume':
        endpoint = `https://api.dlocalgo.com/v1/subscriptions/${modifyData.subscriptionId}/resume`;
        method = 'POST';
        break;
      
      default:
        throw new Error('Invalid action');
    }

    const apiKey = Deno.env.get('DLOCAL_API_KEY') ?? '';
    const secretKey = Deno.env.get('DLOCAL_SECRET_KEY') ?? '';
    const authString = btoa(`${apiKey}:${secretKey}`);

    dlocalResponse = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: method !== 'DELETE' ? JSON.stringify(body) : undefined
    });

    if (!dlocalResponse.ok) {
      const errorText = await dlocalResponse.text();
      console.error('dLocal API error:', errorText);
      throw new Error(`dLocal API error: ${dlocalResponse.status} - ${errorText}`);
    }

    const dlocalData = method !== 'DELETE' ? await dlocalResponse.json() : { success: true };
    console.log('dLocal subscription modified successfully:', dlocalData);

    // Update local subscription status based on action
    const updateData: any = {};
    
    switch (modifyData.action) {
      case 'change_plan':
        if (modifyData.planId) {
          const { data: planData } = await supabase
            .from('subscription_plans')
            .select('id')
            .eq('dlocal_plan_id', modifyData.planId)
            .single();
          
          if (planData) {
            updateData.plan_id = planData.id;
          }
        }
        break;
      
      case 'cancel':
        updateData.status = 'canceled';
        updateData.cancel_at_period_end = true;
        break;
      
      case 'pause':
        updateData.status = 'paused';
        break;
      
      case 'resume':
        updateData.status = 'active';
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('lawyer_subscriptions')
        .update(updateData)
        .eq('dlocal_subscription_id', modifyData.subscriptionId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: dlocalData,
        message: `Subscription ${modifyData.action} completed successfully`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error modifying subscription:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});