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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get reminder config from system_config
    const { data: configData } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'calendar_reminder_hours_before')
      .maybeSingle();

    let reminderHours: number[] = [24, 2];
    try {
      if (configData?.config_value) {
        const parsed = JSON.parse(configData.config_value);
        if (Array.isArray(parsed)) reminderHours = parsed;
      }
    } catch { /* use defaults */ }

    console.log(`[calendar-reminders] Checking reminders for windows: ${reminderHours.join(', ')} hours`);

    const now = new Date();
    const results: any[] = [];

    for (const hours of reminderHours) {
      // Find events starting within this reminder window
      const windowStart = new Date(now.getTime() + (hours * 60 - 30) * 60 * 1000); // hours - 30min
      const windowEnd = new Date(now.getTime() + (hours * 60 + 30) * 60 * 1000);   // hours + 30min

      const { data: events, error } = await supabase
        .from('legal_calendar_events')
        .select('*, monitored_process_id')
        .eq('is_completed', false)
        .gte('start_date', windowStart.toISOString())
        .lte('start_date', windowEnd.toISOString());

      if (error) {
        console.error(`[calendar-reminders] Query error:`, error);
        continue;
      }

      if (!events || events.length === 0) continue;

      console.log(`[calendar-reminders] Found ${events.length} events for ${hours}h window`);

      for (const event of events) {
        const lawyerId = event.lawyer_id;

        // Check if we already sent a reminder for this event+window
        const reminderKey = `cal_reminder_${event.id}_${hours}h`;
        const { data: existingNotif } = await supabase
          .from('lawyer_notifications')
          .select('id')
          .eq('lawyer_id', lawyerId)
          .eq('entity_type', 'calendar_reminder')
          .eq('entity_id', event.id)
          .ilike('message', `%${hours === 24 ? 'mañana' : hours <= 2 ? 'pronto' : hours + ' horas'}%`)
          .limit(1);

        if (existingNotif && existingNotif.length > 0) {
          console.log(`[calendar-reminders] Already notified for event ${event.id} at ${hours}h`);
          continue;
        }

        // Get notification preferences
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('email_enabled, in_app_enabled')
          .eq('lawyer_id', lawyerId)
          .eq('notification_type', 'calendar_reminder')
          .maybeSingle();

        const emailEnabled = prefs?.email_enabled !== false;
        const inAppEnabled = prefs?.in_app_enabled !== false;

        const timeLabel = hours >= 24
          ? `mañana`
          : hours >= 2
            ? `en ${hours} horas`
            : `pronto`;

        const eventTypeLabels: Record<string, string> = {
          audiencia: 'Audiencia',
          deadline: 'Vencimiento',
          filing: 'Presentación',
          meeting: 'Reunión',
        };
        const eventTypeLabel = eventTypeLabels[event.event_type] || event.event_type;

        const title = `⏰ ${eventTypeLabel} ${timeLabel}`;
        const message = `${event.title} - ${new Date(event.start_date).toLocaleDateString('es-CO', {
          weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
        })}`;

        // 1. In-app notification
        if (inAppEnabled) {
          await supabase.from('lawyer_notifications').insert({
            lawyer_id: lawyerId,
            notification_type: 'calendar_reminder',
            title,
            message,
            entity_type: 'calendar_reminder',
            entity_id: event.id,
            action_url: '/#abogados?view=calendario',
            priority: hours <= 2 ? 'high' : 'normal',
          });
          console.log(`[calendar-reminders] In-app notification sent for event ${event.id}`);
        }

        // 2. Email notification
        if (emailEnabled) {
          try {
            // Get lawyer name
            const { data: lawyer } = await supabase
              .from('lawyer_profiles')
              .select('full_name, email')
              .eq('id', lawyerId)
              .single();

            if (lawyer) {
              await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  to: lawyer.email,
                  subject: title,
                  template_key: 'calendar_reminder',
                  variables: {
                    lawyer_name: lawyer.full_name,
                    event_title: event.title,
                    event_date: new Date(event.start_date).toLocaleDateString('es-CO', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    }),
                    event_type: eventTypeLabel,
                    event_description: event.description || '',
                    action_url: 'https://praxis-hub.co/#abogados?view=calendario',
                    current_year: new Date().getFullYear().toString(),
                  },
                  recipient_type: 'lawyer',
                }),
              });
              console.log(`[calendar-reminders] Email sent for event ${event.id}`);
            }
          } catch (emailErr) {
            console.error(`[calendar-reminders] Email error:`, emailErr);
          }
        }

        // 3. Push notification
        try {
          await fetch(`${supabaseUrl}/functions/v1/push-notifications`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              action: 'send',
              user_id: lawyerId,
              title,
              body: message,
              url: '/#abogados?view=calendario',
              tag: `calendar-${event.id}`,
            }),
          });
          console.log(`[calendar-reminders] Push notification sent for event ${event.id}`);
        } catch (pushErr) {
          console.error(`[calendar-reminders] Push error:`, pushErr);
        }

        results.push({ eventId: event.id, title: event.title, hours, channels: { inAppEnabled, emailEnabled, push: true } });
      }
    }

    console.log(`[calendar-reminders] Done. Sent ${results.length} reminders.`);

    return new Response(
      JSON.stringify({ success: true, reminders: results.length, details: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[calendar-reminders] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
