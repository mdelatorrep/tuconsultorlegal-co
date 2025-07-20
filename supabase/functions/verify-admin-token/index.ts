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

    // Verify JWT token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(authToken)
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    // Check if user has admin account
    const { data: admin, error } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle()

    // If no admin account found by user_id, try by email
    if (!admin && user.email) {
      const { data: adminByEmail, error: emailError } = await supabase
        .from('admin_accounts')
        .select('*')
        .eq('email', user.email.toLowerCase())
        .eq('active', true)
        .maybeSingle()
      
      if (emailError || !adminByEmail) {
        return new Response(JSON.stringify({ error: 'Invalid admin token' }), {
          status: 401,
          headers: securityHeaders
        })
      }
      
      // Update the admin account with the user_id
      await supabase
        .from('admin_accounts')
        .update({ user_id: user.id })
        .eq('id', adminByEmail.id)
        
      return new Response(JSON.stringify({
        valid: true,
        user: {
          id: adminByEmail.id,
          email: user.email,
          name: adminByEmail.full_name,
          isAdmin: true,
          isSuperAdmin: adminByEmail.is_super_admin || false
        }
      }), {
        headers: securityHeaders
      })
    }

    if (error || !admin) {
      return new Response(JSON.stringify({ error: 'Invalid admin token' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    // Log successful admin access (optional - would need log_admin_action function)
    // await supabase.rpc('log_admin_action', {
    //   action_type: 'token_verified',
    //   details: { email: user.email }
    // })
    console.log('Admin token verified successfully for:', user.email)

    return new Response(JSON.stringify({
      valid: true,
      user: {
        id: admin.id,
        email: user.email,
        name: admin.full_name,
        isAdmin: true,
        isSuperAdmin: admin.is_super_admin || false
      }
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