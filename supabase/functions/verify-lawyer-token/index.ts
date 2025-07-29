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

    // lawyer_profiles no tiene access_token, retornar error
    return new Response(JSON.stringify({ valid: false, error: 'Token validation not supported - access_token column does not exist in lawyer_profiles' }), {
      status: 401,
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