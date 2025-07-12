import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log(`[${new Date().toISOString()}] Admin login request received`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('Invalid JSON in request body:', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { email, password } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Attempting login for: ${email}`);

    // Query admin account
    const { data: admin, error: fetchError } = await supabase
      .from('admin_accounts')
      .select('id, email, full_name, password_hash, active, is_super_admin, locked_until, failed_login_attempts')
      .eq('email', email.toLowerCase())
      .eq('active', true)
      .maybeSingle();

    if (fetchError) {
      console.error('Database error:', fetchError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!admin) {
      console.log('No admin found');
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if locked
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      console.log('Account locked');
      return new Response(JSON.stringify({ error: 'Account temporarily locked' }), {
        status: 423,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify password (simple comparison)
    if (admin.password_hash !== password) {
      console.log('Invalid password');
      
      // Update failed attempts
      const newAttempts = (admin.failed_login_attempts || 0) + 1;
      const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
      
      await supabase
        .from('admin_accounts')
        .update({
          failed_login_attempts: newAttempts,
          locked_until: lockUntil
        })
        .eq('id', admin.id);

      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate session token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const sessionToken = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Update admin with session
    const { error: sessionError } = await supabase
      .from('admin_accounts')
      .update({
        session_token: sessionToken,
        token_expires_at: expiresAt,
        last_login_at: new Date().toISOString(),
        failed_login_attempts: 0,
        locked_until: null
      })
      .eq('id', admin.id);

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return new Response(JSON.stringify({ error: 'Session creation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Login successful');

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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});