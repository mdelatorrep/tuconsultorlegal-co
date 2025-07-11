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

    console.log('Delete agent function called')

    // Get authorization header
    const authHeader = req.headers.get('authorization')
    console.log('Auth header received:', !!authHeader)
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    // Parse request body
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

    const { agent_id, user_id, is_admin } = requestBody

    // Input validation
    if (!agent_id) {
      return new Response(JSON.stringify({ error: 'Agent ID is required' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    console.log('Attempting to delete agent with ID:', agent_id)

    // Check if agent exists and get its details
    const { data: existingAgent, error: fetchError } = await supabase
      .from('legal_agents')
      .select('id, name, description, created_by, status')
      .eq('id', agent_id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching agent:', fetchError)
      return new Response(JSON.stringify({ error: 'Error fetching agent data' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    if (!existingAgent) {
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        status: 404,
        headers: securityHeaders
      })
    }

    console.log('Found agent to delete:', existingAgent.name)

    // Check permissions - Only admin can delete agents
    if (!is_admin) {
      console.log('Non-admin user attempting to delete agent:', user_id)
      return new Response(JSON.stringify({ error: 'Solo los administradores pueden eliminar agentes' }), {
        status: 403,
        headers: securityHeaders
      })
    }

    // Verify admin status with proper token validation
    let adminToken = authHeader
    if (authHeader.startsWith('Bearer ')) {
      adminToken = authHeader.substring(7)
    }

    const { data: admin, error: tokenError } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('session_token', adminToken)
      .eq('active', true)
      .maybeSingle()

    if (tokenError || !admin) {
      console.error('Admin token verification failed:', tokenError)
      return new Response(JSON.stringify({ error: 'Token de administrador inválido' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    // Check token expiration
    if (admin.token_expires_at && new Date(admin.token_expires_at) < new Date()) {
      console.error('Admin token expired')
      return new Response(JSON.stringify({ error: 'Token de administrador expirado' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    console.log('Admin verified successfully, proceeding with deletion')

    // Delete the agent
    const { error: deleteError } = await supabase
      .from('legal_agents')
      .delete()
      .eq('id', agent_id)

    if (deleteError) {
      console.error('Error deleting agent:', deleteError)
      return new Response(JSON.stringify({ error: 'Error deleting agent' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    console.log('Agent deleted successfully')

    // Log the deletion event
    await supabase.rpc('log_security_event', {
      event_type: 'agent_deleted',
      user_id: admin.id,
      details: { 
        deleted_agent_id: agent_id,
        deleted_agent_name: existingAgent.name,
        deleted_agent_status: existingAgent.status,
        deleted_by_admin: admin.email,
        original_creator: existingAgent.created_by
      }
    })

    return new Response(JSON.stringify({
      success: true,
      message: `Agente "${existingAgent.name}" eliminado exitosamente`
    }), {
      headers: securityHeaders
    })

  } catch (error) {
    console.error('Error in delete-agent function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: securityHeaders
    })
  }
})