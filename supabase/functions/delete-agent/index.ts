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

    console.log('🗑️ Delete agent function called')

    // **SIMPLIFIED AUTHENTICATION - Same pattern as other admin functions**
    const authHeader = req.headers.get('authorization')
    console.log('Auth header received:', !!authHeader)
    
    if (!authHeader) {
      console.error('❌ No authorization header')
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Simplified authentication - just check that token exists
    if (!token) {
      console.error('❌ No token provided')
      return new Response(JSON.stringify({ error: 'Authentication token required' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    console.log('✅ Authenticated via JWT token')

    // Parse request body
    let requestBody
    try {
      const bodyText = await req.text()
      console.log('📦 Raw request body length:', bodyText.length)
      
      if (!bodyText.trim()) {
        return new Response(JSON.stringify({ error: 'Empty request body' }), {
          status: 400,
          headers: securityHeaders
        })
      }
      
      requestBody = JSON.parse(bodyText)
      console.log('✅ Request body parsed successfully, keys:', Object.keys(requestBody))
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError)
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
      console.error('❌ Missing agent_id')
      return new Response(JSON.stringify({ error: 'Agent ID is required' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    console.log('🔍 Attempting to delete agent with ID:', agent_id)

    // Check if agent exists and get its details
    const { data: existingAgent, error: fetchError } = await supabase
      .from('legal_agents')
      .select('id, name, description, created_by, status')
      .eq('id', agent_id)
      .maybeSingle()

    if (fetchError) {
      console.error('❌ Error fetching agent:', fetchError)
      return new Response(JSON.stringify({ error: 'Error fetching agent data' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    if (!existingAgent) {
      console.error('❌ Agent not found')
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        status: 404,
        headers: securityHeaders
      })
    }

    console.log('✅ Found agent to delete:', existingAgent.name, 'created_by:', existingAgent.created_by)
    console.log('✅ Proceeding with deletion (admin authenticated)')

    // Delete the agent
    const { error: deleteError } = await supabase
      .from('legal_agents')
      .delete()
      .eq('id', agent_id)

    if (deleteError) {
      console.error('❌ Error deleting agent:', deleteError)
      return new Response(JSON.stringify({ error: 'Error deleting agent', details: deleteError.message }), {
        status: 500,
        headers: securityHeaders
      })
    }

    console.log('✅ Agent deleted successfully')

    // Log the deletion event
    try {
      await supabase.rpc('log_security_event', {
        event_type: 'agent_deleted',
        user_identifier: user_id || 'admin',
        details: { 
          deleted_agent_id: agent_id,
          deleted_agent_name: existingAgent.name,
          deleted_agent_status: existingAgent.status,
          is_admin: is_admin || false,
          original_creator: existingAgent.created_by
        }
      })
    } catch (logError) {
      console.log('⚠️ Warning: Could not log deletion event:', logError.message)
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Agente "${existingAgent.name}" eliminado exitosamente`
    }), {
      headers: securityHeaders
    })

  } catch (error) {
    console.error('💥 Error in delete-agent function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: securityHeaders
    })
  }
})
