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

    // Get lawyer info for response and email
    const { data: lawyer } = await supabase
      .from('lawyer_profiles')
      .select('full_name, email')
      .eq('id', lawyerId)
      .single();

    // Send motivational email to the lawyer
    if (lawyer?.email) {
      try {
        const emailHtml = `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #1a1a2e; font-size: 24px; margin: 0 0 8px 0;">🎉 ¡Créditos recibidos!</h1>
                <p style="color: #6b7280; font-size: 16px; margin: 0;">Tu práctica legal acaba de recibir un impulso</p>
              </div>
              
              <div style="background: linear-gradient(135deg, #3d5a6c, #4a7c8a); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 4px 0;">Créditos otorgados</p>
                <p style="color: white; font-size: 42px; font-weight: 700; margin: 0;">+${amount}</p>
                <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin: 8px 0 0 0;">Balance actual: ${newBalance} créditos</p>
              </div>

              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
                Hola <strong>${lawyer.full_name}</strong>,
              </p>
              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
                ${reason || 'El equipo de Praxis Hub te ha otorgado créditos.'} Estos créditos están disponibles de inmediato para que sigas aprovechando todas las herramientas del entorno profesional.
              </p>
              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                Úsalos para investigación jurídica, análisis documental, redacción asistida y más. Cada herramienta está diseñada para elevar los estándares de tu práctica.
              </p>

              <div style="text-align: center; margin-bottom: 24px;">
                <a href="https://praxis-hub.co/#abogados" style="display: inline-block; background: #3d5a6c; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  Ir al Dashboard
                </a>
              </div>

              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Praxis Hub — El entorno que eleva la práctica legal<br>
                  © ${new Date().getFullYear()} Praxis Hub
                </p>
              </div>
            </div>
          </div>
        `;

        await supabase.functions.invoke('send-email', {
          body: {
            to: lawyer.email,
            subject: `🎉 ¡Recibiste ${amount} créditos en Praxis Hub!`,
            html: emailHtml
          }
        });
        console.log(`[CREDITS-ADMIN] Motivational email sent to ${lawyer.email}`);
      } catch (emailError) {
        console.error('[CREDITS-ADMIN] Error sending email (non-blocking):', emailError);
      }
    }

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
