import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlanData {
  name: string;
  description: string;
  amount: number;
  currency: string;
  frequency: 'MONTH' | 'YEAR';
  frequency_count: number;
  trial_period_days?: number;
  max_billing_cycles?: number;
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

    const planData: PlanData = await req.json();
    
    console.log('Creating dLocal plan:', planData);

    // Create plan in dLocal
    const dlocalResponse = await fetch('https://api.dlocalgo.com/v1/plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': Deno.env.get('DLOCAL_API_KEY') ?? '',
        'X-SECRET-KEY': Deno.env.get('DLOCAL_SECRET_KEY') ?? ''
      },
      body: JSON.stringify({
        name: planData.name,
        description: planData.description,
        amount: planData.amount,
        currency: planData.currency,
        frequency: planData.frequency,
        frequency_count: planData.frequency_count,
        trial_period_days: planData.trial_period_days || 0,
        max_billing_cycles: planData.max_billing_cycles || 0,
        payment_method_types: ['CARD', 'BANK_TRANSFER']
      })
    });

    if (!dlocalResponse.ok) {
      const errorText = await dlocalResponse.text();
      console.error('dLocal API error:', errorText);
      throw new Error(`dLocal API error: ${dlocalResponse.status} - ${errorText}`);
    }

    const dlocalData = await dlocalResponse.json();
    console.log('dLocal plan created successfully:', dlocalData);

    // Save plan to local database
    const { data: dbPlan, error: dbError } = await supabase
      .from('subscription_plans')
      .insert({
        name: planData.name,
        description: planData.description,
        price_monthly: planData.frequency === 'MONTH' ? planData.amount : planData.amount / 12,
        price_yearly: planData.frequency === 'YEAR' ? planData.amount : planData.amount * 12,
        dlocal_plan_id: dlocalData.id,
        features: [],
        enables_legal_tools: false,
        is_active: true
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save plan to database');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        plan: dlocalData,
        localPlan: dbPlan
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error creating plan:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});