
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    console.log('Starting lawyer login process')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { token, email } = await req.json()
    console.log('Login attempt for email:', email, 'with token:', token?.substring(0, 8) + '***')

    if (!token || !email) {
      console.log('Missing token or email')
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Token y email son requeridos' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Simple query to find lawyer token
    console.log('Searching for lawyer token in database')
    const { data: lawyerToken, error: tokenError } = await supabase
      .from('lawyer_tokens')
      .select('*')
      .eq('access_token', token)
      .eq('email', email)
      .eq('active', true)
      .maybeSingle()

    if (tokenError) {
      console.error('Database error:', tokenError)
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Error de base de datos' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!lawyerToken) {
      console.log('No matching lawyer token found for email:', email)
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Credenciales inválidas' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Lawyer token found, updating last login')
    
    // Update last login
    await supabase
      .from('lawyer_tokens')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', lawyerToken.id)

    console.log('Login successful for:', email)

    // Return success with user data
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: lawyerToken.lawyer_id,
        email: lawyerToken.email,
        name: lawyerToken.full_name,
        canCreateAgents: lawyerToken.can_create_agents
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error in lawyer login:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
