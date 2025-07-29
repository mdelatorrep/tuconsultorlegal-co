
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
    console.log('=== LAWYER LOGIN START ===')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const requestBody = await req.json()
    console.log('Request body received:', requestBody)

    const { token, email } = requestBody
    console.log('Extracted values - Email:', email, 'Token:', token)

    if (!token || !email) {
      console.log('Validation failed - Missing email or token')
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Email y token son requeridos' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Query database for matching lawyer profile
    console.log('Querying database for lawyer profile...')
    const { data: lawyerProfile, error: tokenError } = await supabase
      .from('lawyer_profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('active', true)
      .eq('is_active', true)
      .maybeSingle()

    console.log('Database query result:', { data: lawyerProfile, error: tokenError })

    if (tokenError) {
      console.error('Database error:', tokenError)
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Error consultando base de datos' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!lawyerProfile) {
      console.log('No matching lawyer token found')
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Credenciales inválidas. Verifica tu email y token.' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Valid lawyer token found, updating last login...')
    
    // Update last login timestamp
    const { error: updateError } = await supabase
      .from('lawyer_profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', lawyerProfile.id)

    if (updateError) {
      console.warn('Failed to update last login:', updateError)
    }

    const responseData = {
      success: true,
      user: {
        id: lawyerProfile.id,
        tokenId: lawyerProfile.id, // Usar el mismo ID ya que ahora todo está en una tabla
        email: lawyerProfile.email,
        name: lawyerProfile.full_name,
        canCreateAgents: lawyerProfile.can_create_agents,
        canCreateBlogs: lawyerProfile.can_create_blogs,
        canUseAiTools: lawyerProfile.can_use_ai_tools
      }
    }

    console.log('Login successful! Returning user data:', responseData)

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('=== LAWYER LOGIN ERROR ===', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
