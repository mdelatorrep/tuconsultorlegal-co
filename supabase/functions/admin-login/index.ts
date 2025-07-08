import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get client IP for logging
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Find lawyer account
    const { data: lawyer, error: fetchError } = await supabase
      .from('lawyer_accounts')
      .select('*')
      .eq('email', email)
      .eq('active', true)
      .single()

    if (fetchError || !lawyer) {
      // Log failed login attempt
      await supabase.rpc('log_security_event', {
        event_type: 'admin_login_failed',
        details: { email, reason: 'account_not_found', ip: clientIP, user_agent: userAgent }
      })

      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if account is locked
    if (lawyer.locked_until && new Date(lawyer.locked_until) > new Date()) {
      await supabase.rpc('log_security_event', {
        event_type: 'admin_login_blocked',
        user_id: lawyer.id,
        details: { email, reason: 'account_locked', ip: clientIP, user_agent: userAgent }
      })

      return new Response(JSON.stringify({ error: 'Account temporarily locked' }), {
        status: 423,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify password (comparing with stored hashed access_token)
    const { data: isValidPassword } = await supabase.rpc('verify_admin_token', {
      token: password,
      hash: lawyer.access_token
    })

    if (!isValidPassword) {
      // Increment failed attempts
      const newFailedAttempts = (lawyer.failed_login_attempts || 0) + 1
      let updateData: any = { failed_login_attempts: newFailedAttempts }
      
      // Lock account after 5 failed attempts for 30 minutes
      if (newFailedAttempts >= 5) {
        updateData.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      }

      await supabase
        .from('lawyer_accounts')
        .update(updateData)
        .eq('id', lawyer.id)

      await supabase.rpc('log_security_event', {
        event_type: 'admin_login_failed',
        user_id: lawyer.id,
        details: { 
          email, 
          reason: 'invalid_password', 
          failed_attempts: newFailedAttempts,
          ip: clientIP, 
          user_agent: userAgent 
        }
      })

      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate secure session token (24 hour expiry)
    const sessionToken = crypto.randomUUID() + '-' + Date.now()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // Update lawyer account with session info
    await supabase
      .from('lawyer_accounts')
      .update({
        access_token: sessionToken,
        token_expires_at: expiresAt,
        last_login_at: new Date().toISOString(),
        failed_login_attempts: 0,
        locked_until: null
      })
      .eq('id', lawyer.id)

    // Log successful login
    await supabase.rpc('log_security_event', {
      event_type: 'admin_login_success',
      user_id: lawyer.id,
      details: { email, ip: clientIP, user_agent: userAgent }
    })

    return new Response(JSON.stringify({
      success: true,
      token: sessionToken,
      expiresAt,
      user: {
        id: lawyer.id,
        email: lawyer.email,
        name: lawyer.full_name,
        isAdmin: lawyer.is_admin
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Admin login error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})