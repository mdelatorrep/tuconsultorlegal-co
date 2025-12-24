import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateNotificationRequest {
  lawyer_id: string;
  notification_type: string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  action_url?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  send_email?: boolean;
  email_template_key?: string;
  email_variables?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreateNotificationRequest = await req.json();
    const {
      lawyer_id,
      notification_type,
      title,
      message,
      entity_type,
      entity_id,
      action_url,
      priority = 'normal',
      send_email = false,
      email_template_key,
      email_variables
    } = body;

    console.log(`[create-notification] Creating notification for lawyer ${lawyer_id}:`, {
      notification_type,
      title,
      priority
    });

    // Check notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('email_enabled, in_app_enabled')
      .eq('lawyer_id', lawyer_id)
      .eq('notification_type', notification_type)
      .single();

    // Default to enabled if no preference exists
    const emailEnabled = preferences?.email_enabled ?? true;
    const inAppEnabled = preferences?.in_app_enabled ?? true;

    let notificationId = null;

    // Create in-app notification if enabled
    if (inAppEnabled) {
      const { data: notification, error: notifError } = await supabase
        .from('lawyer_notifications')
        .insert({
          lawyer_id,
          notification_type,
          title,
          message,
          entity_type,
          entity_id,
          action_url,
          priority
        })
        .select('id')
        .single();

      if (notifError) {
        console.error('[create-notification] Error creating notification:', notifError);
        throw notifError;
      }

      notificationId = notification.id;
      console.log(`[create-notification] In-app notification created: ${notificationId}`);
    }

    // Send email if requested and enabled
    if (send_email && emailEnabled) {
      // Get lawyer email
      const { data: lawyer } = await supabase
        .from('lawyer_profiles')
        .select('email, full_name')
        .eq('id', lawyer_id)
        .single();

      if (lawyer?.email) {
        try {
          // Use send-email edge function
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              to: lawyer.email,
              subject: title,
              template_key: email_template_key,
              variables: {
                lawyer_name: lawyer.full_name,
                notification_title: title,
                notification_message: message,
                action_url: action_url || 'https://tuconsultorlegal.co/#abogados',
                current_year: new Date().getFullYear().toString(),
                ...email_variables
              },
              recipient_type: 'lawyer'
            })
          });

          if (!emailResponse.ok) {
            console.error('[create-notification] Email send failed:', await emailResponse.text());
          } else {
            console.log(`[create-notification] Email sent to ${lawyer.email}`);
          }
        } catch (emailError) {
          console.error('[create-notification] Email error:', emailError);
          // Don't fail the whole operation for email errors
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notificationId,
        in_app_sent: inAppEnabled,
        email_sent: send_email && emailEnabled
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-notification] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
