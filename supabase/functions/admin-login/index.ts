import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const securityHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
}

interface AdminLoginRequest {
  email: string;
  password: string;
}

interface AdminAccount {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  active: boolean;
  is_super_admin: boolean;
  locked_until: string | null;
  failed_login_attempts: number | null;
}

// Generate secure session token
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Calculate account lock time
function calculateLockTime(attempts: number): string | null {
  if (attempts >= 5) {
    return new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
  }
  return null;
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
      headers: securityHeaders 
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: securityHeaders
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate request
    const body: AdminLoginRequest = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: securityHeaders
      });
    }

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: securityHeaders
      });
    }

    console.log(`Attempting login for email: ${email}`);

    // Query admin account
    const { data: admin, error: fetchError } = await supabase
      .from('admin_accounts')
      .select('id, email, full_name, password_hash, active, is_super_admin, locked_until, failed_login_attempts')
      .eq('email', email.toLowerCase())
      .eq('active', true)
      .maybeSingle();

    if (fetchError) {
      console.error('Database query error:', fetchError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: securityHeaders
      });
    }

    if (!admin) {
      console.log(`No admin account found for email: ${email}`);
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: securityHeaders
      });
    }

    // Check if account is locked
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      console.log(`Account locked until: ${admin.locked_until}`);
      return new Response(JSON.stringify({ error: 'Account temporarily locked' }), {
        status: 423,
        headers: securityHeaders
      });
    }

    // Verify password (simple comparison for now - should use bcrypt in production)
    const isValidPassword = admin.password_hash === password;

    if (!isValidPassword) {
      console.log('Invalid password provided');
      
      // Update failed attempts
      const newFailedAttempts = (admin.failed_login_attempts || 0) + 1;
      const lockUntil = calculateLockTime(newFailedAttempts);
      
      const { error: updateError } = await supabase
        .from('admin_accounts')
        .update({
          failed_login_attempts: newFailedAttempts,
          locked_until: lockUntil
        })
        .eq('id', admin.id);

      if (updateError) {
        console.error('Failed to update failed attempts:', updateError);
      }

      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: securityHeaders
      });
    }

    // Generate session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Update admin account with session info
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
      console.error('Failed to create session:', sessionError);
      return new Response(JSON.stringify({ error: 'Session creation failed' }), {
        status: 500,
        headers: securityHeaders
      });
    }

    console.log(`Login successful for admin: ${admin.email}`);

    // Return success response
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
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: securityHeaders
    });
  }
});