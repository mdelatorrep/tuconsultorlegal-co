import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlanData {
  name: string;
  description: string;
  country?: string;
  currency: string;
  amount: number;
  frequency_type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  frequency_value?: number;
  day_of_month?: number;
  max_periods?: number;
  notification_url?: string;
  success_url?: string;
  back_url?: string;
  error_url?: string;
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
      .maybeSingle();

    if (adminError) {
      console.error('Database error checking admin:', adminError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!adminProfile) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const planData: PlanData = await req.json();
    
    console.log('Creating dLocal plan:', planData);

    // Create plan in dLocal
    const apiKey = Deno.env.get('DLOCAL_API_KEY') ?? '';
    const secretKey = Deno.env.get('DLOCAL_SECRET_KEY') ?? '';
    const authString = btoa(`${apiKey}:${secretKey}`);
    
    const dlocalResponse = await fetch('https://api.dlocalgo.com/v1/subscription/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authString}`
      },
      body: JSON.stringify({
        name: planData.name,
        description: planData.description,
        country: planData.country,
        currency: planData.currency,
        amount: planData.amount,
        frequency_type: planData.frequency_type,
        frequency_value: planData.frequency_value || 1,
        day_of_month: planData.day_of_month,
        max_periods: planData.max_periods,
        notification_url: planData.notification_url,
        success_url: planData.success_url,
        back_url: planData.back_url,
        error_url: planData.error_url
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
    const isMonthly = planData.frequency_type === 'MONTHLY';
    const isYearly = planData.frequency_type === 'YEARLY';
    const baseAmount = planData.amount;
    
    const { data: dbPlan, error: dbError } = await supabase
      .from('subscription_plans')
      .insert({
        name: planData.name,
        description: planData.description,
        price_monthly: isMonthly ? baseAmount : (isYearly ? baseAmount / 12 : baseAmount),
        price_yearly: isYearly ? baseAmount : (isMonthly ? baseAmount * 12 : baseAmount * 12),
        dlocal_plan_id: dlocalData.id,
        features: [],
        enables_legal_tools: false,
        is_active: true
      })
      .select()
      .maybeSingle();

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