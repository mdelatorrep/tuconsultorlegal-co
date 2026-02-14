import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[CREDITS-ADMIN] Request received, method:', req.method);

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    console.log('[CREDITS-ADMIN] Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.log('[CREDITS-ADMIN] No auth header found');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    console.log('[CREDITS-ADMIN] User lookup result:', user?.id, user?.email, 'error:', authError?.message);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: adminProfile, error: adminError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle();

    console.log('[CREDITS-ADMIN] Admin profile lookup for user_id:', user.id, 'result:', adminProfile?.id, 'error:', adminError?.message);

    if (adminError || !adminProfile) {
      return new Response(
        JSON.stringify({ error: 'Admin access required', debug_user_id: user.id, debug_email: user.email }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { lawyerId, amount, reason } = await req.json();

    if (!lawyerId || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'lawyerId and positive amount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CREDITS-ADMIN] Admin ${user.email} granting ${amount} credits to lawyer ${lawyerId}`);

    // Get current balance or create record
    let currentBalance = 0;
    let totalEarned = 0;

    const { data: credits, error: creditsError } = await supabase
      .from('lawyer_credits')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .single();

    if (creditsError && creditsError.code !== 'PGRST116') {
      console.error('[CREDITS-ADMIN] Error fetching credits:', creditsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (credits) {
      currentBalance = credits.current_balance;
      totalEarned = credits.total_earned;
    }

    const newBalance = currentBalance + amount;
    const newTotalEarned = totalEarned + amount;

    // Upsert credits
    const { error: upsertError } = await supabase
      .from('lawyer_credits')
      .upsert({
        lawyer_id: lawyerId,
        current_balance: newBalance,
        total_earned: newTotalEarned,
        updated_at: new Date().toISOString()
      }, { onConflict: 'lawyer_id' });

    if (upsertError) {
      console.error('[CREDITS-ADMIN] Error updating credits:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to grant credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        lawyer_id: lawyerId,
        transaction_type: 'admin_grant',
        amount: amount,
        balance_after: newBalance,
        reference_type: 'admin',
        description: reason || `Créditos asignados por admin (${adminProfile.full_name})`,
        metadata: {
          granted_by: user.id,
          granted_by_name: adminProfile.full_name,
          granted_by_email: user.email
        }
      });

    if (transactionError) {
      console.error('[CREDITS-ADMIN] Error recording transaction:', transactionError);
    }

    // Get lawyer info for response
    const { data: lawyer } = await supabase
      .from('lawyer_profiles')
      .select('full_name, email')
      .eq('id', lawyerId)
      .single();

    console.log(`[CREDITS-ADMIN] Successfully granted ${amount} credits. New balance: ${newBalance}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        creditsGranted: amount,
        newBalance,
        lawyer: lawyer ? { name: lawyer.full_name, email: lawyer.email } : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CREDITS-ADMIN] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
