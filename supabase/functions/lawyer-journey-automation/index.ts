import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { nowColombia, currentYearColombia } from "../_shared/colombia-tz.ts";

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
  recurring: boolean;
  cooldownDays: number;
  condition: (lawyer: any, transactions: any[]) => boolean;
}

// Helper: calculate days since last usage (consumption/usage transactions)
function getDaysSinceLastUsage(transactions: any[], colombiaNow: Date): number {
  const usageTxs = transactions.filter(t => 
    t.transaction_type === 'usage' || t.transaction_type === 'consumption'
  );
  if (usageTxs.length === 0) return 999;
  const lastTx = usageTxs.sort((a: any, b: any) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
  return Math.floor(
    (colombiaNow.getTime() - new Date(lastTx.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
}

// ===== ONBOARDING STEPS (one-time, based on registration date) =====
const ONBOARDING_STEPS: JourneyStep[] = [
  {
    step: 'day_1',
    daysMin: 1, daysMax: 2,
    templateKey: 'lawyer_journey_day1_tip',
    bonusCredits: 5,
    notificationType: 'system',
    notificationTitle: '🚀 Tip: Usa tu primera herramienta IA',
    notificationMessage: 'Te hemos otorgado 5 créditos de activación. Explora el análisis legal IA para empezar.',
    notificationPriority: 'normal',
    recurring: false, cooldownDays: 0,
    condition: () => true,
  },
  {
    step: 'day_3',
    daysMin: 3, daysMax: 6,
    templateKey: 'lawyer_journey_day3_nudge',
    bonusCredits: 0,
    notificationType: 'system',
    notificationTitle: '🤖 ¿Aún no has probado la IA?',
    notificationMessage: 'Tienes créditos disponibles. Prueba tu primer análisis legal con IA.',
    notificationPriority: 'normal',
    recurring: false, cooldownDays: 0,
    condition: (_lawyer: any, transactions: any[]) => {
      return transactions.filter(t => t.transaction_type === 'consumption').length === 0;
    },
  },
  {
    step: 'day_7',
    daysMin: 7, daysMax: 13,
    templateKey: 'lawyer_journey_day7_profile',
    bonusCredits: 3,
    notificationType: 'system',
    notificationTitle: '👤 Completa tu perfil profesional',
    notificationMessage: 'Completar tu perfil te da acceso a funcionalidades avanzadas. ¡Te hemos dado 3 créditos bonus!',
    notificationPriority: 'normal',
    recurring: false, cooldownDays: 0,
    condition: (lawyer: any, transactions: any[]) => {
      const consumptions = transactions.filter(t => t.transaction_type === 'consumption');
      return !lawyer.phone_number || !lawyer.specialization || consumptions.length === 0;
    },
  },
  {
    step: 'day_14',
    daysMin: 14, daysMax: 29,
    templateKey: 'lawyer_reengagement',
    bonusCredits: 10,
    notificationType: 'system',
    notificationTitle: '⚠️ Te extrañamos en Praxis Hub',
    notificationMessage: 'Llevas más de 14 días sin actividad. Te hemos otorgado 10 créditos de reactivación.',
    notificationPriority: 'urgent',
    recurring: false, cooldownDays: 0,
    condition: (_lawyer: any, transactions: any[]) => {
      if (transactions.length === 0) return true;
      const lastTx = transactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      const daysSince = Math.floor(
        (nowColombia().getTime() - new Date(lastTx.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSince > 14;
    },
  },
  {
    step: 'day_30',
    daysMin: 30, daysMax: 999,
    templateKey: 'lawyer_journey_day30_lastchance',
    bonusCredits: 15,
    notificationType: 'system',
    notificationTitle: '💎 Última oportunidad - 15 créditos gratis',
    notificationMessage: 'Te hemos otorgado 15 créditos como última bonificación especial. ¡No los dejes pasar!',
    notificationPriority: 'urgent',
    recurring: false, cooldownDays: 0,
    condition: (_lawyer: any, transactions: any[]) => {
      if (transactions.length === 0) return true;
      const lastTx = transactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      const daysSince = Math.floor(
        (nowColombia().getTime() - new Date(lastTx.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSince > 30;
    },
  },
];

// ===== RE-ENGAGEMENT STEPS (recurring, based on real inactivity) =====
const REENGAGEMENT_STEPS: JourneyStep[] = [
  {
    step: 'reengagement_at_risk',
    daysMin: 0, daysMax: 999, // Not used for recurring; we use inactivity-based logic
    templateKey: 'lawyer_reengagement_at_risk',
    bonusCredits: 5,
    notificationType: 'system',
    notificationTitle: '⚠️ Te extrañamos en Praxis Hub',
    notificationMessage: 'Llevas varios días sin usar las herramientas IA. Te hemos otorgado 5 créditos de reactivación.',
    notificationPriority: 'normal',
    recurring: true,
    cooldownDays: 30,
    condition: (_lawyer: any, transactions: any[]) => {
      const days = getDaysSinceLastUsage(transactions, nowColombia());
      return days >= 7 && days < 15;
    },
  },
  {
    step: 'reengagement_critical',
    daysMin: 0, daysMax: 999,
    templateKey: 'lawyer_reengagement_critical',
    bonusCredits: 10,
    notificationType: 'system',
    notificationTitle: '🚨 Tu cuenta necesita atención',
    notificationMessage: 'Llevas más de 15 días sin actividad. Te hemos otorgado 10 créditos para reactivarte.',
    notificationPriority: 'high',
    recurring: true,
    cooldownDays: 45,
    condition: (_lawyer: any, transactions: any[]) => {
      const days = getDaysSinceLastUsage(transactions, nowColombia());
      return days >= 15 && days < 30;
    },
  },
  {
    step: 'reengagement_churned',
    daysMin: 0, daysMax: 999,
    templateKey: 'lawyer_reengagement_churned',
    bonusCredits: 15,
    notificationType: 'system',
    notificationTitle: '💎 Última oportunidad - 15 créditos gratis',
    notificationMessage: 'Llevas más de 30 días sin actividad. Te hemos otorgado 15 créditos como bonificación especial.',
    notificationPriority: 'urgent',
    recurring: true,
    cooldownDays: 60,
    condition: (_lawyer: any, transactions: any[]) => {
      const days = getDaysSinceLastUsage(transactions, nowColombia());
      return days >= 30;
    },
  },
];

const ALL_STEPS = [...ONBOARDING_STEPS, ...REENGAGEMENT_STEPS];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[journey-automation] Starting journey automation run (Colombia GMT-5)...');

    // Get admin email for BCC on all journey emails
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('email')
      .eq('active', true)
      .limit(1)
      .single();

    const adminBccEmail = adminProfile?.email || null;
    console.log(`[journey-automation] Admin BCC: ${adminBccEmail || 'none'}`);

    const { data: lawyers, error: lawyersError } = await supabase
      .from('lawyer_profiles')
      .select('id, full_name, email, phone_number, specialization, created_at, is_active')
      .eq('is_active', true);

    if (lawyersError) throw lawyersError;

    // Get ALL tracking data (for one-time check + recurring cooldown check)
    const { data: existingTracking } = await supabase
      .from('lawyer_journey_tracking')
      .select('lawyer_id, journey_step, sent_at, is_recurring');

    const trackingSet = new Set(
      (existingTracking || []).filter(t => !t.is_recurring).map(t => `${t.lawyer_id}:${t.journey_step}`)
    );

    // Build a map of last execution per recurring step per lawyer
    const recurringLastExecution = new Map<string, Date>();
    for (const t of (existingTracking || []).filter(t => t.is_recurring)) {
      const key = `${t.lawyer_id}:${t.journey_step}`;
      const sentAt = new Date(t.sent_at);
      const existing = recurringLastExecution.get(key);
      if (!existing || sentAt > existing) {
        recurringLastExecution.set(key, sentAt);
      }
    }

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: allTransactions } = await supabase
      .from('credit_transactions')
      .select('lawyer_id, transaction_type, created_at')
      .gte('created_at', ninetyDaysAgo);

    const summary = { emails_sent: 0, credits_granted: 0, notifications_created: 0, errors: 0 };
    const colombiaNow = nowColombia();

    for (const lawyer of (lawyers || [])) {
      const daysSinceRegistration = Math.floor(
        (colombiaNow.getTime() - new Date(lawyer.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      const lawyerTransactions = (allTransactions || []).filter(t => t.lawyer_id === lawyer.id);

      for (const step of ALL_STEPS) {
        // For one-time steps: check if already executed
        if (!step.recurring) {
          if (trackingSet.has(`${lawyer.id}:${step.step}`)) continue;
          if (daysSinceRegistration < step.daysMin || daysSinceRegistration > step.daysMax) continue;
        }

        // For recurring steps: check cooldown
        if (step.recurring) {
          // Only process recurring steps for lawyers registered > 7 days (past onboarding)
          if (daysSinceRegistration < 7) continue;

          const lastExecKey = `${lawyer.id}:${step.step}`;
          const lastExec = recurringLastExecution.get(lastExecKey);
          if (lastExec) {
            const daysSinceLastExec = Math.floor(
              (colombiaNow.getTime() - lastExec.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceLastExec < step.cooldownDays) continue;
          }
        }

        if (!step.condition(lawyer, lawyerTransactions)) continue;

        console.log(`[journey-automation] Processing ${step.step} for ${lawyer.email} (recurring: ${step.recurring})`);

        try {
          // Send email
          const { data: template } = await supabase
            .from('email_templates')
            .select('subject, html_body')
            .eq('template_key', step.templateKey)
            .eq('is_active', true)
            .single();

          if (template) {
            const baseUrl = 'https://praxis-hub.co';
            const dashboardUrl = baseUrl + '/#abogados';
            const currentYear = currentYearColombia().toString();
            const daysInactive = String(getDaysSinceLastUsage(lawyerTransactions, colombiaNow));

            let emailSubject = template.subject
              .replace(/\{\{lawyer_name\}\}/g, lawyer.full_name)
              .replace(/\{\{current_year\}\}/g, currentYear);

            let emailHtml = template.html_body
              .replace(/\{\{lawyer_name\}\}/g, lawyer.full_name)
              .replace(/\{\{dashboard_url\}\}/g, dashboardUrl)
              .replace(/\{\{current_year\}\}/g, currentYear)
              .replace(/\{\{site_url\}\}/g, baseUrl)
              .replace(/\{\{days_inactive\}\}/g, daysInactive);

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

          // Grant bonus credits
          if (step.bonusCredits > 0) {
            const { data: credits, error: creditsReadErr } = await supabase
              .from('lawyer_credits')
              .select('current_balance, total_earned')
              .eq('lawyer_id', lawyer.id)
              .single();

            if (creditsReadErr) {
              console.error(`[journey-automation] Credits read error for ${lawyer.email}:`, creditsReadErr.message);
            } else if (credits) {
              const newBalance = credits.current_balance + step.bonusCredits;
              
              const { error: updateErr } = await supabase
                .from('lawyer_credits')
                .update({
                  current_balance: newBalance,
                  total_earned: credits.total_earned + step.bonusCredits
                })
                .eq('lawyer_id', lawyer.id);

              if (updateErr) {
                console.error(`[journey-automation] Credits update error for ${lawyer.email}:`, updateErr.message);
              } else {
                const { error: txErr } = await supabase
                  .from('credit_transactions')
                  .insert({
                    lawyer_id: lawyer.id,
                    transaction_type: 'journey_bonus',
                    amount: step.bonusCredits,
                    balance_after: newBalance,
                    description: `Journey ${step.step}: ${step.bonusCredits} créditos bonus${step.recurring ? ' (recurrente)' : ''}`
                  });

                if (txErr) {
                  console.error(`[journey-automation] Transaction insert error:`, txErr.message);
                } else {
                  summary.credits_granted += step.bonusCredits;
                }
              }
            }
          }

          // Create notification
          const { error: notifError } = await supabase.rpc('create_lawyer_notification', {
            p_lawyer_id: lawyer.id,
            p_notification_type: step.notificationType,
            p_title: step.notificationTitle,
            p_message: step.notificationMessage,
            p_priority: step.notificationPriority
          });

          if (notifError) {
            console.error(`[journey-automation] Notification error for ${lawyer.email}:`, notifError.message);
          } else {
            summary.notifications_created++;
          }

          // Send admin alert for critical/churned re-engagement
          if (step.recurring && (step.step === 'reengagement_critical' || step.step === 'reengagement_churned')) {
            const { data: adminProfile } = await supabase
              .from('admin_profiles')
              .select('email')
              .eq('active', true)
              .limit(1)
              .single();

            if (adminProfile) {
              console.log(`[journey-automation] Admin alert: ${lawyer.full_name} entered ${step.step}`);
            }
          }

          // Record tracking
          const { error: trackingErr } = await supabase
            .from('lawyer_journey_tracking')
            .insert({
              lawyer_id: lawyer.id,
              journey_step: step.step,
              is_recurring: step.recurring,
              action_taken: `email${step.bonusCredits > 0 ? ',credits' : ''},notification`,
              metadata: {
                template_key: step.templateKey,
                bonus_credits: step.bonusCredits,
                days_since_registration: daysSinceRegistration,
                days_since_last_usage: getDaysSinceLastUsage(lawyerTransactions, colombiaNow),
                is_recurring: step.recurring
              }
            });

          if (trackingErr) {
            console.error(`[journey-automation] Tracking insert error for ${lawyer.email}:`, trackingErr.message);
          }

        } catch (stepError) {
          console.error(`[journey-automation] Error on ${step.step} for ${lawyer.email}:`, stepError);
          summary.errors++;
        }
      }
    }

    console.log('[journey-automation] Run complete:', summary);

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
