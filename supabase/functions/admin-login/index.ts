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
        headers: securityHeaders
      })
    }

    // Input validation and sanitization
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    if (password.length < 8 || password.length > 128) {
      return new Response(JSON.stringify({ error: 'Invalid password length' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    // Get client IP for logging and rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Check rate limiting
    const { data: rateLimitOk } = await supabase.rpc('check_rate_limit', {
      identifier_param: clientIP,
      attempt_type_param: 'admin_login',
      max_attempts: 5,
      window_minutes: 15,
      block_minutes: 30
    })

    if (!rateLimitOk) {
      await supabase.rpc('log_security_event', {
        event_type: 'admin_login_rate_limited',
        details: { email, ip: clientIP, user_agent: userAgent }
      })

      return new Response(JSON.stringify({ error: 'Too many attempts. Please try again later.' }), {
        status: 429,
        headers: securityHeaders
      })
    }

    // Find admin account
    const { data: admin, error: fetchError } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('email', email)
      .eq('active', true)
      .maybeSingle()

    if (fetchError) {
      console.error('Database error during admin login:', fetchError)
      return new Response(JSON.stringify({ error: 'Database error occurred' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    if (!admin) {
      // Log failed login attempt
      await supabase.rpc('log_security_event', {
        event_type: 'admin_login_failed',
        details: { email, reason: 'account_not_found', ip: clientIP, user_agent: userAgent }
      })

      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    // Check if account is locked
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      await supabase.rpc('log_security_event', {
        event_type: 'admin_login_blocked',
        user_id: admin.id,
        details: { email, reason: 'account_locked', ip: clientIP, user_agent: userAgent }
      })

      return new Response(JSON.stringify({ error: 'Account temporarily locked' }), {
        status: 423,
        headers: securityHeaders
      })
    }

    // Verify password using bcrypt comparison
    const { data: isValidPassword } = await supabase.rpc('verify_password', {
      password: password,
      hash: admin.password_hash
    })

    if (!isValidPassword) {
      // Increment failed attempts
      const newFailedAttempts = (admin.failed_login_attempts || 0) + 1
      let updateData: any = { failed_login_attempts: newFailedAttempts }
      
      // Lock account after 5 failed attempts for 30 minutes
      if (newFailedAttempts >= 5) {
        updateData.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      }

      await supabase
        .from('admin_accounts')
        .update(updateData)
        .eq('id', admin.id)

      await supabase.rpc('log_security_event', {
        event_type: 'admin_login_failed',
        user_id: admin.id,
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
        headers: securityHeaders
      })
    }

    // Generate cryptographically secure session token (24 hour expiry)
    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const sessionToken = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // Update admin account with session info
    await supabase
      .from('admin_accounts')
      .update({
        session_token: sessionToken,
        token_expires_at: expiresAt,
        last_login_at: new Date().toISOString(),
        failed_login_attempts: 0,
        locked_until: null
      })
      .eq('id', admin.id)

    // Reset rate limits on successful login
    await supabase.rpc('reset_rate_limit', {
      identifier_param: clientIP,
      attempt_type_param: 'admin_login'
    })

    // Log successful login
    await supabase.rpc('log_security_event', {
      event_type: 'admin_login_success',
      user_id: admin.id,
      details: { email, ip: clientIP, user_agent: userAgent }
    })

    return new Response(JSON.stringify({
      success: true,
      token: sessionToken,
      expiresAt,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.full_name,
        isAdmin: true,
        isSuperAdmin: admin.is_super_admin
      }
    }), {
      headers: securityHeaders
    })

  } catch (error) {
    console.error('Admin login error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: securityHeaders
    })
  }
})