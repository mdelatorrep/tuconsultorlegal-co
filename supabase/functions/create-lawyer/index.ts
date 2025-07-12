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
    // Create Supabase client for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Create lawyer function called - START OF FUNCTION')

    // Get the authenticated user from the JWT (automatically verified by Supabase)
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    // Extract JWT token
    const jwt = authHeader.replace('Bearer ', '')
    
    // Create a client with the user's JWT to get user info
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    )

    console.log('Getting authenticated user...')
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await userSupabase.auth.getUser()

    if (userError || !user) {
      console.error('User authentication failed:', userError)
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    console.log('User authenticated:', user.email)

    // Check if user has admin profile using service role
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle()

    if (profileError || !adminProfile) {
      console.error('Admin profile verification failed:', profileError)
      return new Response(JSON.stringify({ error: 'Admin privileges required' }), {
        status: 403,
        headers: securityHeaders
      })
    }

    console.log('Admin verified successfully:', user.email)

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
      phone_number, 
      can_create_agents
    } = requestBody

    // Input validation
    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: 'Email and full name are required' }), {
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

    // Check if email already exists in lawyer_tokens
    const { data: existingToken, error: checkError } = await supabase
      .from('lawyer_tokens')
      .select('email')
      .eq('email', email.toLowerCase())
      .eq('active', true)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing lawyer token:', checkError)
      return new Response(JSON.stringify({ error: 'Database error checking existing account' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    if (existingToken) {
      return new Response(JSON.stringify({ error: 'Email already exists' }), {
        status: 409,
        headers: securityHeaders
      })
    }

    console.log('Email is unique, proceeding with creation')

    // Generate a readable access token based on the lawyer's name
    const nameSlug = full_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]/g, '') // Keep only letters and numbers
      .substring(0, 12) // Limit length
    
    const randomSuffix = Math.random().toString(36).substring(2, 8) // 6 random characters
    const accessToken = `${nameSlug}${randomSuffix}`.toUpperCase()

    console.log('Creating lawyer with access token:', accessToken)

    // Create lawyer token (this is the main authentication mechanism)
    // Using service role to bypass RLS restrictions
    const { data: tokenData, error: tokenError } = await supabase
      .from('lawyer_tokens')
      .insert({
        access_token: accessToken,
        email: email.toLowerCase(),
        full_name: full_name,
        phone_number: phone_number || null,
        can_create_agents: can_create_agents || false,
        lawyer_id: crypto.randomUUID(), // Generate unique lawyer_id
        created_by: adminProfile.id
      })
      .select()
      .single()

    if (tokenError) {
      console.error('Error creating lawyer token:', tokenError)
      return new Response(JSON.stringify({ 
        error: `Error al crear token de acceso: ${tokenError.message}`,
        details: tokenError.details || 'No additional details'
      }), {
        status: 500,
        headers: securityHeaders
      })
    }

    console.log('Lawyer token created successfully')

    return new Response(JSON.stringify({
      success: true,
      lawyer: {
        ...tokenData,
        // The access_token is the secure password the admin should provide to the lawyer
        secure_password: accessToken
      }
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