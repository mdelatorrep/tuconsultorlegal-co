import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const securityHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
}

interface SecurityEventBody {
  event_type: string;
  user_identifier?: string;
  details?: Record<string, any>;
  ip_address?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: securityHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get client IP address
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';

    const body: SecurityEventBody = await req.json();

    if (!body.event_type) {
      return new Response(JSON.stringify({ error: 'Event type is required' }), {
        status: 400,
        headers: securityHeaders
      });
    }

    // Log the security event
    const { error } = await supabase
      .from('security_audit_log')
      .insert({
        event_type: body.event_type,
        user_identifier: body.user_identifier,
        details: body.details || {},
        ip_address: body.ip_address || clientIP
      });

    if (error) {
      console.error('Error logging security event:', error);
      return new Response(JSON.stringify({ error: 'Failed to log security event' }), {
        status: 500,
        headers: securityHeaders
      });
    }

    console.log(`Security event logged: ${body.event_type} for ${body.user_identifier || 'anonymous'}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: securityHeaders
    });

  } catch (error) {
    console.error('Error in log-security-event:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: securityHeaders
    });
  }
});