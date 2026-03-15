import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { sessionId, utmParams, eventType, lawyerId, landingPage, referrer, campaignId } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error } = await supabase.from('utm_tracking_events').insert({
      session_id: sessionId || null,
      utm_source: utmParams?.utm_source || null,
      utm_medium: utmParams?.utm_medium || null,
      utm_campaign: utmParams?.utm_campaign || null,
      utm_term: utmParams?.utm_term || null,
      utm_content: utmParams?.utm_content || null,
      landing_page: landingPage || null,
      referrer: referrer || null,
      user_agent: req.headers.get('user-agent') || null,
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      lawyer_id: lawyerId || null,
      event_type: eventType || 'visit',
      campaign_id: campaignId || null,
    })

    if (error) {
      console.error('Error inserting UTM event:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('UTM track event error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
