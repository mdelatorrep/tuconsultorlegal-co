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

    console.log('Create lawyer function called')

    // Get admin token from headers
    const authHeader = req.headers.get('authorization')
    console.log('Auth header received:', !!authHeader)
    
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

    console.log('Verifying admin token...')

    // Verify token against admin_accounts table
    const { data: admin, error: tokenError } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('session_token', adminToken)
      .eq('active', true)
      .maybeSingle()

    if (tokenError || !admin) {
      console.error('Admin token verification failed:', tokenError)
      return new Response(JSON.stringify({ error: 'Invalid admin token' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    // Check token expiration
    if (admin.token_expires_at && new Date(admin.token_expires_at) < new Date()) {
      console.error('Admin token expired')
      return new Response(JSON.stringify({ error: 'Admin token expired' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    console.log('Admin verified successfully')

    let requestBody
    try {
      const bodyText = await req.text()
      console.log('Raw request body:', bodyText.substring(0, 200))
      
      if (!bodyText.trim()) {
        return new Response(JSON.stringify({ error: 'Empty request body' }), {
          status: 400,
          headers: securityHeaders
        })
      }
      
      requestBody = JSON.parse(bodyText)
      console.log('Request body parsed successfully, keys:', Object.keys(requestBody))
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        message: parseError.message 
      }), {
        status: 400,
        headers: securityHeaders
      })
    }

    const { 
      email, 
      full_name, 
      password, 
      phone_number, 
      can_create_agents
      // REMOVIDO: is_admin - los abogados NO pueden ser administradores
    } = requestBody

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

    console.log('Validations passed, creating lawyer account')

    // Check if email already exists
    const { data: existingLawyer, error: checkError } = await supabase
      .from('lawyer_accounts')
      .select('email')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing lawyer:', checkError)
      return new Response(JSON.stringify({ error: 'Database error checking existing account' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    if (existingLawyer) {
      return new Response(JSON.stringify({ error: 'Email already exists' }), {
        status: 409,
        headers: securityHeaders
      })
    }

    console.log('Email is unique, proceeding with creation')

    // Generate a random UUID for access_token
    const accessToken = crypto.randomUUID()

    console.log('Attempting to insert lawyer with data:', {
      email: email.toLowerCase(),
      full_name: full_name,
      phone_number: phone_number || null,
      can_create_agents: can_create_agents || false
    })

    // Create lawyer account (sin permisos de administrador)
    const { data, error } = await supabase
      .from('lawyer_accounts')
      .insert([{
        email: email.toLowerCase(),
        full_name: full_name,
        password_hash: password, // Will be automatically hashed by trigger
        access_token: accessToken,
        phone_number: phone_number || null,
        can_create_agents: can_create_agents || false
        // REMOVIDO: is_admin - los abogados no son administradores
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating lawyer:', error)
      return new Response(JSON.stringify({ 
        error: `Database error: ${error.message}`,
        details: error.details || 'No additional details'
      }), {
        status: 500,
        headers: securityHeaders
      })
    }

    console.log('Lawyer created successfully')

    return new Response(JSON.stringify({
      success: true,
      lawyer: data || null
    }), {
      headers: securityHeaders
    })

  } catch (error) {
    console.error('Create lawyer error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: securityHeaders
    })
  }
})