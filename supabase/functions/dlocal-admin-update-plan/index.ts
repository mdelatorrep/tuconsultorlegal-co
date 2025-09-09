import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdatePlanData {
  planId: string;
  name?: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
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

    const updateData: UpdatePlanData = await req.json();
    
    console.log('Updating dLocal plan:', updateData);

    // Update plan in dLocal
    const dlocalResponse = await fetch(`https://api.dlocalgo.com/v1/plans/${updateData.planId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': Deno.env.get('DLOCAL_API_KEY') ?? '',
        'X-SECRET-KEY': Deno.env.get('DLOCAL_SECRET_KEY') ?? ''
      },
      body: JSON.stringify({
        name: updateData.name,
        description: updateData.description,
        status: updateData.status,
        trial_period_days: updateData.trial_period_days,
        max_billing_cycles: updateData.max_billing_cycles
      })
    });

    if (!dlocalResponse.ok) {
      const errorText = await dlocalResponse.text();
      console.error('dLocal API error:', errorText);
      throw new Error(`dLocal API error: ${dlocalResponse.status} - ${errorText}`);
    }

    const dlocalData = await dlocalResponse.json();
    console.log('dLocal plan updated successfully:', dlocalData);

    // Update plan in local database if exists
    if (updateData.name || updateData.description || updateData.status) {
      const updateFields: any = {};
      
      if (updateData.name) updateFields.name = updateData.name;
      if (updateData.description) updateFields.description = updateData.description;
      if (updateData.status) updateFields.is_active = updateData.status === 'ACTIVE';

      await supabase
        .from('subscription_plans')
        .update(updateFields)
        .eq('dlocal_plan_id', updateData.planId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        plan: dlocalData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error updating plan:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});