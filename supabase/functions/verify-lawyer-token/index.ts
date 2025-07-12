import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const { token } = await req.json()

    if (!token) {
      return new Response(JSON.stringify({ valid: false, error: 'Token required' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    // Find lawyer token
    const { data: lawyerToken, error: tokenError } = await supabase
      .from('lawyer_tokens')
      .select('*')
      .eq('access_token', token)
      .eq('active', true)
      .maybeSingle()

    if (tokenError) {
      console.error('Error checking lawyer token:', tokenError)
      return new Response(JSON.stringify({ valid: false, error: 'Database error' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    if (!lawyerToken) {
      return new Response(JSON.stringify({ valid: false, error: 'Invalid token' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    // Check if token is expired
    if (lawyerToken.token_expires_at && new Date(lawyerToken.token_expires_at) <= new Date()) {
      return new Response(JSON.stringify({ valid: false, error: 'Token expired' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    // Update last used timestamp
    await supabase
      .from('lawyer_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', lawyerToken.id)

    return new Response(JSON.stringify({
      valid: true,
      user: {
        id: lawyerToken.lawyer_id,
        email: lawyerToken.email,
        name: lawyerToken.full_name,
        canCreateAgents: lawyerToken.can_create_agents
      }
    }), {
      headers: securityHeaders
    })

  } catch (error) {
    console.error('Lawyer token verification error:', error)
    return new Response(JSON.stringify({ valid: false, error: 'Internal server error' }), {
      status: 500,
      headers: securityHeaders
    })
  }
})