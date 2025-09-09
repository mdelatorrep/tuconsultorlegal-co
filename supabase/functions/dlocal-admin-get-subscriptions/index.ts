import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const url = new URL(req.url);
    const planId = url.searchParams.get('planId');
    const limit = url.searchParams.get('limit') || '50';
    const offset = url.searchParams.get('offset') || '0';

    console.log('Getting dLocal subscriptions, planId:', planId);

    let dlocalUrl = `https://api.dlocalgo.com/v1/subscriptions?limit=${limit}&offset=${offset}`;
    if (planId) {
      dlocalUrl += `&plan_id=${planId}`;
    }

    // Get subscriptions from dLocal
    const dlocalResponse = await fetch(dlocalUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': Deno.env.get('DLOCAL_API_KEY') ?? '',
        'X-SECRET-KEY': Deno.env.get('DLOCAL_SECRET_KEY') ?? ''
      }
    });

    if (!dlocalResponse.ok) {
      const errorText = await dlocalResponse.text();
      console.error('dLocal API error:', errorText);
      throw new Error(`dLocal API error: ${dlocalResponse.status} - ${errorText}`);
    }

    const dlocalData = await dlocalResponse.json();
    console.log('dLocal subscriptions retrieved successfully');

    // Get local subscription data with lawyer info
    const { data: localSubscriptions, error: localError } = await supabase
      .from('lawyer_subscriptions')
      .select(`
        *,
        lawyer_profiles!inner(full_name, email),
        subscription_plans(name, description)
      `);

    if (localError) {
      console.error('Local database error:', localError);
    }

    // Merge dLocal and local data
    const mergedSubscriptions = dlocalData.subscriptions?.map((dLocalSub: any) => {
      const localSub = localSubscriptions?.find(ls => ls.dlocal_subscription_id === dLocalSub.id);
      return {
        ...dLocalSub,
        local_data: localSub,
        lawyer_name: localSub?.lawyer_profiles?.full_name,
        lawyer_email: localSub?.lawyer_profiles?.email,
        plan_name: localSub?.subscription_plans?.name
      };
    }) || [];

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscriptions: mergedSubscriptions,
        pagination: dlocalData.pagination || {}
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error getting subscriptions:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});