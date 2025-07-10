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

    const authToken = req.headers.get('authorization')?.replace('Bearer ', '')

    if (!authToken) {
      return new Response(JSON.stringify({ error: 'No token provided' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    // Verify token against admin_accounts table (not lawyer_accounts)
    const { data: admin, error } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('session_token', authToken)
      .eq('active', true)
      .maybeSingle()

    if (error || !admin) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    // Check token expiration
    if (admin.token_expires_at && new Date(admin.token_expires_at) < new Date()) {
      // Log token expiration
      await supabase.rpc('log_security_event', {
        event_type: 'admin_token_expired',
        user_id: admin.id,
        details: { email: admin.email }
      })

      return new Response(JSON.stringify({ error: 'Token expired' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    return new Response(JSON.stringify({
      valid: true,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.full_name,
        isAdmin: true,
        isSuperAdmin: admin.is_super_admin
      },
      expiresAt: admin.token_expires_at
    }), {
      headers: securityHeaders
    })

  } catch (error) {
    console.error('Token verification error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: securityHeaders
    })
  }
})