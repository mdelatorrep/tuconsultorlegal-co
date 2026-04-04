import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getValidAccessToken(supabase: any, lawyerId: string): Promise<string | null> {
  const { data: tokenData } = await supabase
    .from('lawyer_google_tokens')
    .select('*')
    .eq('lawyer_id', lawyerId)
    .single();

  if (!tokenData) return null;

  const expiresAt = new Date(tokenData.token_expires_at);
  const now = new Date();

  // If token is still valid (with 5 min buffer)
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return tokenData.access_token;
  }

  // Refresh the token
  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: tokenData.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const refreshData = await refreshResponse.json();

  if (!refreshResponse.ok) {
    console.error('Token refresh failed:', refreshData);
    return null;
  }

  const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();

  await supabase
    .from('lawyer_google_tokens')
    .update({
      access_token: refreshData.access_token,
      token_expires_at: newExpiresAt,
    })
    .eq('lawyer_id', lawyerId);

  return refreshData.access_token;
}

function mapEventTypeToColor(eventType: string): string {
  const colors: Record<string, string> = {
    audiencia: '11', // red
    deadline: '5',   // banana
    filing: '7',     // peacock
    meeting: '9',    // blueberry
    reminder: '6',   // tangerine
    other: '8',      // graphite
  };
  return colors[eventType] || '8';
}

// Extract YYYY-MM-DD from a timestamp or date string
function extractDatePart(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  // Handle ISO timestamps like "2026-04-17T00:00:00+00:00" or "2026-04-17 00:00:00+00"
  return dateStr.split('T')[0].split(' ')[0];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, lawyer_id, event_data, event_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const accessToken = await getValidAccessToken(supabase, lawyer_id);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No hay conexión con Google Calendar. Conecta tu cuenta primero.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Sync all events: push local → Google, pull Google → local
    if (action === 'sync_all') {
      let synced_count = 0;
      let imported_count = 0;

      // 1. Push local events to Google Calendar
      const { data: localEvents } = await supabase
        .from('legal_calendar_events')
        .select('*')
        .eq('lawyer_id', lawyer_id);

      for (const event of (localEvents || [])) {
        if (event.external_calendar_id) continue; // Already synced

        const googleEvent = {
          summary: event.title,
          description: event.description || undefined,
          location: event.location || undefined,
          colorId: mapEventTypeToColor(event.event_type),
          start: event.all_day
            ? { date: event.start_date }
            : { dateTime: `${event.start_date}T09:00:00`, timeZone: 'America/Bogota' },
          end: event.all_day
            ? { date: event.end_date || event.start_date }
            : { dateTime: `${event.end_date || event.start_date}T10:00:00`, timeZone: 'America/Bogota' },
        };

        const createRes = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
          method: 'POST',
          headers,
          body: JSON.stringify(googleEvent),
        });

        if (createRes.ok) {
          const created = await createRes.json();
          await supabase
            .from('legal_calendar_events')
            .update({ external_calendar_id: created.id })
            .eq('id', event.id);
          synced_count++;
        } else {
          const errBody = await createRes.text();
          console.error(`Failed to push event ${event.id}:`, errBody);
        }
      }

      // 2. Pull Google Calendar events (next 90 days)
      const now = new Date();
      const futureDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const listParams = new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: futureDate.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      });

      const listRes = await fetch(`${CALENDAR_API}/calendars/primary/events?${listParams}`, {
        headers,
      });

      if (listRes.ok) {
        const listData = await listRes.json();
        const googleEvents = listData.items || [];

        // Get existing external IDs
        const { data: existingEvents } = await supabase
          .from('legal_calendar_events')
          .select('external_calendar_id')
          .eq('lawyer_id', lawyer_id)
          .not('external_calendar_id', 'is', null);

        const existingIds = new Set((existingEvents || []).map((e: any) => e.external_calendar_id));

        for (const gEvent of googleEvents) {
          if (existingIds.has(gEvent.id)) continue;

          const startDate = gEvent.start?.date || (gEvent.start?.dateTime ? gEvent.start.dateTime.split('T')[0] : null);
          const endDate = gEvent.end?.date || (gEvent.end?.dateTime ? gEvent.end.dateTime.split('T')[0] : null);

          if (!startDate) continue;

          const { error: insertError } = await supabase
            .from('legal_calendar_events')
            .insert({
              lawyer_id: lawyer_id,
              title: gEvent.summary || 'Sin título',
              description: gEvent.description || null,
              event_type: 'other',
              start_date: startDate,
              end_date: endDate || startDate,
              all_day: !!gEvent.start?.date,
              location: gEvent.location || null,
              external_calendar_id: gEvent.id,
              is_completed: false,
            });

          if (!insertError) imported_count++;
        }
      }

      // Update last synced timestamp
      await supabase
        .from('lawyer_google_tokens')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('lawyer_id', lawyer_id);

      return new Response(
        JSON.stringify({ success: true, synced_count, imported_count }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create single event in Google Calendar
    if (action === 'create_event' && event_data) {
      const googleEvent = {
        summary: event_data.title,
        description: event_data.description || undefined,
        location: event_data.location || undefined,
        colorId: mapEventTypeToColor(event_data.event_type || 'other'),
        start: event_data.all_day
          ? { date: event_data.start_date }
          : { dateTime: `${event_data.start_date}T${event_data.start_time || '09:00'}:00`, timeZone: 'America/Bogota' },
        end: event_data.all_day
          ? { date: event_data.end_date || event_data.start_date }
          : { dateTime: `${event_data.end_date || event_data.start_date}T${event_data.end_time || '10:00'}:00`, timeZone: 'America/Bogota' },
      };

      const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify(googleEvent),
      });

      const data = await res.json();
      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: 'Error creating Google event', details: data }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, google_event_id: data.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete event from Google Calendar
    if (action === 'delete_event' && event_id) {
      const res = await fetch(`${CALENDAR_API}/calendars/primary/events/${event_id}`, {
        method: 'DELETE',
        headers,
      });

      return new Response(
        JSON.stringify({ success: res.ok }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Acción no válida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in google-calendar-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
