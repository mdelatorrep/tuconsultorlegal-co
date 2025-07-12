import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const securityHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: securityHeaders 
    })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables')
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    // Input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    // Get client info for logging
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    // Find admin account
    const { data: admin, error: fetchError } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('active', true)
      .maybeSingle()

    if (fetchError) {
      console.error('Database error:', fetchError)
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    if (!admin) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    // Check if account is locked
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      return new Response(JSON.stringify({ error: 'Account temporarily locked' }), {
        status: 423,
        headers: securityHeaders
      })
    }

    // Verify password using database function
    const { data: isValidPassword, error: verifyError } = await supabase.rpc('verify_password', {
      password: password,
      hash: admin.password_hash
    })

    if (verifyError) {
      console.error('Password verification error:', verifyError)
      return new Response(JSON.stringify({ error: 'Authentication error' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    if (!isValidPassword) {
      // Update failed attempts
      const newFailedAttempts = (admin.failed_login_attempts || 0) + 1
      let updateData: any = { failed_login_attempts: newFailedAttempts }
      
      if (newFailedAttempts >= 5) {
        updateData.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      }

      await supabase
        .from('admin_accounts')
        .update(updateData)
        .eq('id', admin.id)

      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    // Generate session token
    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const sessionToken = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // Update admin account with session info
    const { error: updateError } = await supabase
      .from('admin_accounts')
      .update({
        session_token: sessionToken,
        token_expires_at: expiresAt,
        last_login_at: new Date().toISOString(),
        failed_login_attempts: 0,
        locked_until: null
      })
      .eq('id', admin.id)

    if (updateError) {
      console.error('Failed to update admin session:', updateError)
      return new Response(JSON.stringify({ error: 'Session creation failed' }), {
        status: 500,
        headers: securityHeaders
      })
    }

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