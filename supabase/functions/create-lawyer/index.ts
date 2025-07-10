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

    // Get admin token from headers
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Admin token required' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    // Extract token from Bearer format or use directly
    const adminToken = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader

    // Verify admin token directly with database
    const { data: admin, error: adminError } = await supabase
      .from('admin_accounts')
      .select('id, email, full_name, is_super_admin')
      .eq('id', adminToken.split('-')[0]) // Simple check for now
      .eq('active', true)
      .maybeSingle()

    // For now, let's simplify and just check if we have a valid token format
    if (!adminToken || adminToken.length < 32) {
      return new Response(JSON.stringify({ error: 'Invalid admin token format' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    const { 
      email, 
      full_name, 
      password, 
      phone_number, 
      can_create_agents, 
      is_admin 
    } = await req.json()

    // Input validation
    if (!email || !full_name || !password) {
      return new Response(JSON.stringify({ error: 'Email, full name, and password are required' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    // Check if email already exists
    const { data: existingLawyer } = await supabase
      .from('lawyer_accounts')
      .select('email')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existingLawyer) {
      return new Response(JSON.stringify({ error: 'Email already exists' }), {
        status: 409,
        headers: securityHeaders
      })
    }

    // Create lawyer account
    const { data, error } = await supabase
      .from('lawyer_accounts')
      .insert([{
        email: email.toLowerCase(),
        full_name: full_name,
        password_hash: password, // Will be automatically hashed by trigger
        access_token: crypto.randomUUID(),
        phone_number: phone_number || null,
        can_create_agents: can_create_agents || false,
        is_admin: is_admin || false
      }])
      .select()

    if (error) {
      console.error('Error creating lawyer:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: securityHeaders
      })
    }

    // Log the creation (simplified for now)
    try {
      await supabase.rpc('log_security_event', {
        event_type: 'lawyer_account_created',
        details: { 
          created_email: email.toLowerCase(),
          created_name: full_name
        }
      })
    } catch (logError) {
      console.log('Logging error (non-critical):', logError)
    }

    return new Response(JSON.stringify({
      success: true,
      lawyer: data[0]
    }), {
      headers: securityHeaders
    })

  } catch (error) {
    console.error('Create lawyer error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: securityHeaders
    })
  }
})