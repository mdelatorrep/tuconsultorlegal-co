import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REFERRER_CREDITS = 20;
const REFERRED_CREDITS = 15;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, lawyerId, referralCode } = await req.json();

    console.log(`[REFERRAL] Processing action: ${action}`);

    if (action === 'get_code') {
      // Get or create referral code for lawyer
      if (!lawyerId) {
        return new Response(
          JSON.stringify({ error: 'lawyerId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: existing, error: fetchError } = await supabase
        .from('lawyer_referrals')
        .select('referral_code')
        .eq('referrer_id', lawyerId)
        .eq('referred_id', null)
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ referralCode: existing.referral_code }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create new referral code
      const newCode = 'REF-' + lawyerId.substring(0, 8).toUpperCase();
      
      const { error: insertError } = await supabase
        .from('lawyer_referrals')
        .insert({
          referrer_id: lawyerId,
          referral_code: newCode
        });

      if (insertError) {
        // If duplicate, try with random suffix
        const randomCode = 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        await supabase.from('lawyer_referrals').insert({
          referrer_id: lawyerId,
          referral_code: randomCode
        });
        
        return new Response(
          JSON.stringify({ referralCode: randomCode }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ referralCode: newCode }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'apply_code') {
      // New lawyer applying a referral code
      if (!lawyerId || !referralCode) {
        return new Response(
          JSON.stringify({ error: 'lawyerId and referralCode are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find the referral record
      const { data: referral, error: refError } = await supabase
        .from('lawyer_referrals')
        .select('*')
        .eq('referral_code', referralCode.toUpperCase())
        .is('referred_id', null)
        .single();

      if (refError || !referral) {
        console.log('[REFERRAL] Code not found or already used:', referralCode);
        return new Response(
          JSON.stringify({ error: 'Invalid or already used referral code' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Prevent self-referral
      if (referral.referrer_id === lawyerId) {
        return new Response(
          JSON.stringify({ error: 'Cannot use your own referral code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update referral record
      const { error: updateRefError } = await supabase
        .from('lawyer_referrals')
        .update({
          referred_id: lawyerId,
          status: 'credited',
          credits_awarded_referrer: REFERRER_CREDITS,
          credits_awarded_referred: REFERRED_CREDITS,
          credited_at: new Date().toISOString()
        })
        .eq('id', referral.id);

      if (updateRefError) {
        console.error('[REFERRAL] Error updating referral:', updateRefError);
        return new Response(
          JSON.stringify({ error: 'Failed to process referral' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Award credits to referrer
      const { data: referrerCredits } = await supabase
        .from('lawyer_credits')
        .select('current_balance, total_earned')
        .eq('lawyer_id', referral.referrer_id)
        .single();

      const referrerNewBalance = (referrerCredits?.current_balance || 0) + REFERRER_CREDITS;
      const referrerNewEarned = (referrerCredits?.total_earned || 0) + REFERRER_CREDITS;

      await supabase.from('lawyer_credits').upsert({
        lawyer_id: referral.referrer_id,
        current_balance: referrerNewBalance,
        total_earned: referrerNewEarned,
        updated_at: new Date().toISOString()
      }, { onConflict: 'lawyer_id' });

      await supabase.from('credit_transactions').insert({
        lawyer_id: referral.referrer_id,
        transaction_type: 'referral',
        amount: REFERRER_CREDITS,
        balance_after: referrerNewBalance,
        reference_type: 'referral',
        reference_id: referral.id,
        description: 'Bonus por referir a un colega'
      });

      // Award credits to referred
      const { data: referredCredits } = await supabase
        .from('lawyer_credits')
        .select('current_balance, total_earned')
        .eq('lawyer_id', lawyerId)
        .single();

      const referredNewBalance = (referredCredits?.current_balance || 0) + REFERRED_CREDITS;
      const referredNewEarned = (referredCredits?.total_earned || 0) + REFERRED_CREDITS;

      await supabase.from('lawyer_credits').upsert({
        lawyer_id: lawyerId,
        current_balance: referredNewBalance,
        total_earned: referredNewEarned,
        updated_at: new Date().toISOString()
      }, { onConflict: 'lawyer_id' });

      await supabase.from('credit_transactions').insert({
        lawyer_id: lawyerId,
        transaction_type: 'referral',
        amount: REFERRED_CREDITS,
        balance_after: referredNewBalance,
        reference_type: 'referral',
        reference_id: referral.id,
        description: 'Bonus de bienvenida por código de referido'
      });

      console.log(`[REFERRAL] Successfully processed referral. Referrer ${referral.referrer_id} got ${REFERRER_CREDITS}, referred ${lawyerId} got ${REFERRED_CREDITS}`);

      return new Response(
        JSON.stringify({ 
          success: true,
          creditsAwarded: REFERRED_CREDITS,
          message: `¡Has recibido ${REFERRED_CREDITS} créditos de bienvenida!`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_stats') {
      // Get referral stats for a lawyer
      if (!lawyerId) {
        return new Response(
          JSON.stringify({ error: 'lawyerId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: referrals, error: statsError } = await supabase
        .from('lawyer_referrals')
        .select('*, referred:referred_id(full_name)')
        .eq('referrer_id', lawyerId)
        .not('referred_id', 'is', null);

      if (statsError) {
        console.error('[REFERRAL] Error fetching stats:', statsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch referral stats' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const totalCreditsEarned = referrals?.reduce((sum, r) => sum + r.credits_awarded_referrer, 0) || 0;

      return new Response(
        JSON.stringify({ 
          referrals: referrals || [],
          totalReferrals: referrals?.length || 0,
          totalCreditsEarned
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[REFERRAL] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
