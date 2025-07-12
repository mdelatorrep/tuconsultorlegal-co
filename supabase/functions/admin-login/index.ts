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
  console.log(`[${new Date().toISOString()}] Admin login request received`);
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request');
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: securityHeaders 
    })
  }

  try {
    console.log('Step 1: Checking environment variables');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Present' : 'Missing');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    console.log('Step 2: Creating Supabase client');
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log('Supabase client created successfully');

    console.log('Step 3: Parsing request body');
    const requestBody = await req.json()
    console.log('Request body keys:', Object.keys(requestBody));
    
    const { email, password } = requestBody

    if (!email || !password) {
      console.log('Missing credentials - email:', !!email, 'password:', !!password);
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    console.log('Step 4: Validating email format');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log('Invalid email format:', email);
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    console.log('Step 5: Searching for admin account with email:', email);
    const { data: admin, error: fetchError } = await supabase
      .from('admin_accounts')
      .select('id, email, full_name, password_hash, active, is_super_admin, locked_until, failed_login_attempts')
      .eq('email', email.toLowerCase())
      .eq('active', true)
      .maybeSingle()

    console.log('Database query result - admin found:', !!admin, 'error:', fetchError);

    if (fetchError) {
      console.error('Database error:', fetchError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    if (!admin) {
      console.log('No admin account found for email:', email);
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    console.log('Step 6: Checking if account is locked');
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      console.log('Account is locked until:', admin.locked_until);
      return new Response(JSON.stringify({ error: 'Account temporarily locked' }), {
        status: 423,
        headers: securityHeaders
      })
    }

    console.log('Step 7: Verifying password using hash comparison');
    // Simple password verification for debugging
    const isValidPassword = admin.password_hash === password;
    console.log('Password verification result:', isValidPassword);

    if (!isValidPassword) {
      console.log('Invalid password provided');
      
      // Update failed attempts
      const newFailedAttempts = (admin.failed_login_attempts || 0) + 1
      console.log('Updating failed attempts to:', newFailedAttempts);
      
      let updateData: any = { failed_login_attempts: newFailedAttempts }
      
      if (newFailedAttempts >= 5) {
        updateData.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString()
        console.log('Account will be locked until:', updateData.locked_until);
      }

      const { error: updateError } = await supabase
        .from('admin_accounts')
        .update(updateData)
        .eq('id', admin.id)

      if (updateError) {
        console.error('Failed to update failed attempts:', updateError);
      }

      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    console.log('Step 8: Generating session token');
    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const sessionToken = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    
    console.log('Session token generated, length:', sessionToken.length);
    console.log('Token expires at:', expiresAt);

    console.log('Step 9: Updating admin account with session info');
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
      console.error('Failed to update admin session:', updateError);
      return new Response(JSON.stringify({ error: 'Session creation failed' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    console.log('Step 10: Login successful, returning response');
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