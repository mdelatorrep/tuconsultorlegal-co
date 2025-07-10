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

    console.log('Verifying admin token for agents query...')

    // Verify token against admin_accounts table (for admin users only)
    const { data: admin, error: tokenError } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('session_token', authToken)
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

    console.log('Admin token verified, fetching agents...')

    // Fetch all agents with lawyer information - using service role to bypass RLS
    const { data: agents, error: agentsError } = await supabase
      .from('legal_agents')
      .select(`
        *,
        lawyer_accounts!created_by (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (agentsError) {
      console.error('Error fetching agents:', agentsError)
      return new Response(JSON.stringify({ error: 'Error fetching agents' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    console.log(`Successfully fetched ${agents?.length || 0} agents`)

    return new Response(JSON.stringify(agents || []), {
      headers: securityHeaders
    })

  } catch (error) {
    console.error('Error in get-agents-admin:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: securityHeaders
    })
  }
})