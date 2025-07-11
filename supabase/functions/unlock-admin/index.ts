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

    console.log('Unlock admin account function called')

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

    const { email, secret_key } = requestBody

    // Input validation
    if (!email || !secret_key) {
      return new Response(JSON.stringify({ error: 'Email and secret key are required' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    // Verify secret key (this should be a secure key only known to super admins)
    const expectedSecretKey = 'UNLOCK_ADMIN_2025_SECURE_KEY'
    if (secret_key !== expectedSecretKey) {
      console.log('Invalid secret key provided')
      return new Response(JSON.stringify({ error: 'Invalid secret key' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    console.log('Attempting to unlock admin account for email:', email)

    // Find admin account
    const { data: admin, error: fetchError } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('email', email)
      .eq('active', true)
      .maybeSingle()

    if (fetchError) {
      console.error('Database error during admin lookup:', fetchError)
      return new Response(JSON.stringify({ error: 'Database error occurred' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    if (!admin) {
      return new Response(JSON.stringify({ error: 'Admin account not found' }), {
        status: 404,
        headers: securityHeaders
      })
    }

    console.log('Found admin account, unlocking...')

    // Reset failed attempts and clear lock
    const { error: updateError } = await supabase
      .from('admin_accounts')
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', admin.id)

    if (updateError) {
      console.error('Error unlocking admin account:', updateError)
      return new Response(JSON.stringify({ error: 'Error unlocking account' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    console.log('Admin account unlocked successfully')

    // Log the unlock event
    await supabase.rpc('log_security_event', {
      event_type: 'admin_account_unlocked',
      user_id: admin.id,
      details: { 
        email: admin.email,
        unlocked_at: new Date().toISOString(),
        method: 'emergency_unlock'
      }
    })

    return new Response(JSON.stringify({
      success: true,
      message: `Cuenta de administrador desbloqueada exitosamente para ${email}`
    }), {
      headers: securityHeaders
    })

  } catch (error) {
    console.error('Error in unlock-admin function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: securityHeaders
    })
  }
})