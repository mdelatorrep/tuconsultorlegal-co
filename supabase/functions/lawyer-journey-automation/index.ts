import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JourneyStep {
  step: string;
  daysMin: number;
  daysMax: number;
  templateKey: string;
  bonusCredits: number;
  notificationType: string;
  notificationTitle: string;
  notificationMessage: string;
  notificationPriority: string;
  condition: (lawyer: any, transactions: any[]) => boolean;
}

const JOURNEY_STEPS: JourneyStep[] = [
  {
    step: 'day_1',
    daysMin: 1,
    daysMax: 2,
    templateKey: 'lawyer_journey_day1_tip',
    bonusCredits: 5,
    notificationType: 'system',
    notificationTitle: '🚀 Tip: Usa tu primera herramienta IA',
    notificationMessage: 'Te hemos otorgado 5 créditos de activación. Explora el análisis legal IA para empezar.',
    notificationPriority: 'normal',
    condition: () => true, // Always send
  },
  {
    step: 'day_3',
    daysMin: 3,
    daysMax: 6,
    templateKey: 'lawyer_journey_day3_nudge',
    bonusCredits: 0,
    notificationType: 'system',
    notificationTitle: '🤖 ¿Aún no has probado la IA?',
    notificationMessage: 'Tienes créditos disponibles. Prueba tu primer análisis legal con IA.',
    notificationPriority: 'normal',
    condition: (_lawyer: any, transactions: any[]) => {
      const consumptions = transactions.filter(t => t.transaction_type === 'consumption');
      return consumptions.length === 0;
    },
  },
  {
    step: 'day_7',
    daysMin: 7,
    daysMax: 13,
    templateKey: 'lawyer_journey_day7_profile',
    bonusCredits: 3,
    notificationType: 'system',
    notificationTitle: '👤 Completa tu perfil profesional',
    notificationMessage: 'Completar tu perfil te da acceso a funcionalidades avanzadas. ¡Te hemos dado 3 créditos bonus!',
    notificationPriority: 'normal',
    condition: (lawyer: any, transactions: any[]) => {
      const consumptions = transactions.filter(t => t.transaction_type === 'consumption');
      const profileIncomplete = !lawyer.phone || !lawyer.specialty;
      return profileIncomplete || consumptions.length === 0;
    },
  },
  {
    step: 'day_14',
    daysMin: 14,
    daysMax: 29,
    templateKey: 'lawyer_reengagement',
    bonusCredits: 10,
    notificationType: 'system',
    notificationTitle: '⚠️ Te extrañamos en Praxis Hub',
    notificationMessage: 'Llevas más de 14 días sin actividad. Te hemos otorgado 10 créditos de reactivación.',
    notificationPriority: 'urgent',
    condition: (_lawyer: any, transactions: any[]) => {
      if (transactions.length === 0) return true;
      const lastTx = transactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      const daysSinceLastActivity = Math.floor(
        (Date.now() - new Date(lastTx.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceLastActivity > 14;
    },
  },
  {
    step: 'day_30',
    daysMin: 30,
    daysMax: 999,
    templateKey: 'lawyer_journey_day30_lastchance',
    bonusCredits: 15,
    notificationType: 'system',
    notificationTitle: '💎 Última oportunidad - 15 créditos gratis',
    notificationMessage: 'Te hemos otorgado 15 créditos como última bonificación especial. ¡No los dejes pasar!',
    notificationPriority: 'urgent',
    condition: (_lawyer: any, transactions: any[]) => {
      if (transactions.length === 0) return true;
      const lastTx = transactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      const daysSinceLastActivity = Math.floor(
        (Date.now() - new Date(lastTx.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceLastActivity > 30;
    },
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[journey-automation] Starting journey automation run...');

    // Fetch all active lawyers
    const { data: lawyers, error: lawyersError } = await supabase
      .from('lawyer_profiles')
      .select('id, full_name, email, phone_number, specialization, created_at, is_active')
      .eq('is_active', true);

    if (lawyersError) throw lawyersError;

    // Fetch existing journey tracking records
    const { data: existingTracking } = await supabase
      .from('lawyer_journey_tracking')
      .select('lawyer_id, journey_step');

    const trackingSet = new Set(
      (existingTracking || []).map(t => `${t.lawyer_id}:${t.journey_step}`)
    );

    // Fetch all credit transactions (last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: allTransactions } = await supabase
      .from('credit_transactions')
      .select('lawyer_id, transaction_type, created_at')
      .gte('created_at', ninetyDaysAgo);

    const summary = { emails_sent: 0, credits_granted: 0, notifications_created: 0, errors: 0 };

    for (const lawyer of (lawyers || [])) {
      const daysSinceRegistration = Math.floor(
        (Date.now() - new Date(lawyer.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      const lawyerTransactions = (allTransactions || []).filter(t => t.lawyer_id === lawyer.id);

      for (const step of JOURNEY_STEPS) {
        // Check if already sent
        if (trackingSet.has(`${lawyer.id}:${step.step}`)) continue;

        // Check if within the day range for this step
        if (daysSinceRegistration < step.daysMin || daysSinceRegistration > step.daysMax) continue;

        // Check condition
        if (!step.condition(lawyer, lawyerTransactions)) continue;

        console.log(`[journey-automation] Processing ${step.step} for ${lawyer.email}`);

        try {
          // 1. Send email
          const { data: template } = await supabase
            .from('email_templates')
            .select('subject, html_body')
            .eq('template_key', step.templateKey)
            .eq('is_active', true)
            .single();

          if (template) {
            const baseUrl = 'https://praxis-hub.co';
            const dashboardUrl = baseUrl + '/#abogados';
            const currentYear = new Date().getFullYear().toString();

            let emailSubject = template.subject
              .replace(/\{\{lawyer_name\}\}/g, lawyer.full_name)
              .replace(/\{\{current_year\}\}/g, currentYear);

            let emailHtml = template.html_body
              .replace(/\{\{lawyer_name\}\}/g, lawyer.full_name)
              .replace(/\{\{dashboard_url\}\}/g, dashboardUrl)
              .replace(/\{\{current_year\}\}/g, currentYear)
              .replace(/\{\{site_url\}\}/g, baseUrl)
              .replace(/\{\{days_inactive\}\}/g, String(daysSinceRegistration));

            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify({
                to: lawyer.email,
                subject: emailSubject,
                html: emailHtml,
                template_key: step.templateKey,
                recipient_type: 'lawyer'
              })
            });

            if (emailResponse.ok) {
              summary.emails_sent++;
            } else {
              console.error(`[journey-automation] Email failed for ${lawyer.email}:`, await emailResponse.text());
            }
          }

          // 2. Grant bonus credits if any
          if (step.bonusCredits > 0) {
            // Get current balance
            const { data: credits } = await supabase
              .from('lawyer_credits')
              .select('current_balance, total_earned')
              .eq('lawyer_id', lawyer.id)
              .single();

            if (credits) {
              const newBalance = credits.current_balance + step.bonusCredits;
              
              await supabase
                .from('lawyer_credits')
                .update({
                  current_balance: newBalance,
                  total_earned: credits.total_earned + step.bonusCredits
                })
                .eq('lawyer_id', lawyer.id);

              await supabase
                .from('credit_transactions')
                .insert({
                  lawyer_id: lawyer.id,
                  transaction_type: 'journey_bonus',
                  amount: step.bonusCredits,
                  balance_after: newBalance,
                  description: `Journey ${step.step}: ${step.bonusCredits} créditos bonus`
                });

              summary.credits_granted += step.bonusCredits;
            }
          }

          // 3. Create in-app notification
          const { error: notifError } = await supabase.rpc('create_lawyer_notification', {
            p_lawyer_id: lawyer.id,
            p_notification_type: step.notificationType,
            p_title: step.notificationTitle,
            p_message: step.notificationMessage,
            p_priority: step.notificationPriority
          });

          if (!notifError) {
            summary.notifications_created++;
          }

          // 4. Record in tracking table
          await supabase
            .from('lawyer_journey_tracking')
            .insert({
              lawyer_id: lawyer.id,
              journey_step: step.step,
              action_taken: `email${step.bonusCredits > 0 ? ',credits' : ''},notification`,
              metadata: {
                template_key: step.templateKey,
                bonus_credits: step.bonusCredits,
                days_since_registration: daysSinceRegistration
              }
            });

        } catch (stepError) {
          console.error(`[journey-automation] Error on ${step.step} for ${lawyer.email}:`, stepError);
          summary.errors++;
        }
      }
    }

    console.log('[journey-automation] Run complete:', summary);

    // Notify admin about the run
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('email')
      .eq('active', true)
      .limit(1)
      .single();

    if (adminProfile && (summary.emails_sent > 0 || summary.credits_granted > 0)) {
      console.log(`[journey-automation] Summary - Emails: ${summary.emails_sent}, Credits: ${summary.credits_granted}, Notifications: ${summary.notifications_created}`);
    }

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[journey-automation] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
