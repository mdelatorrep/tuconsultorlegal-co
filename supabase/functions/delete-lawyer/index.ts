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

  if (req.method !== 'DELETE') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Delete lawyer function called')

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

    console.log('Admin token length:', adminToken.length)

    // Basic token validation
    if (!adminToken || adminToken.length < 32) {
      return new Response(JSON.stringify({ error: 'Invalid admin token format' }), {
        status: 401,
        headers: securityHeaders
      })
    }

    const requestBody = await req.json()
    console.log('Request body received:', Object.keys(requestBody))

    const { lawyer_id } = requestBody

    // Input validation
    if (!lawyer_id) {
      return new Response(JSON.stringify({ error: 'Lawyer ID is required' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    console.log('Validations passed, deleting lawyer account')

    // First, get lawyer info for logging
    const { data: lawyerInfo, error: fetchError } = await supabase
      .from('lawyer_accounts')
      .select('email, full_name')
      .eq('id', lawyer_id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching lawyer info:', fetchError)
      return new Response(JSON.stringify({ error: 'Database error fetching lawyer info' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    if (!lawyerInfo) {
      return new Response(JSON.stringify({ error: 'Lawyer not found' }), {
        status: 404,
        headers: securityHeaders
      })
    }

    console.log('Lawyer found, proceeding with deletion:', lawyerInfo.email)

    // Delete the lawyer account
    const { error: deleteError } = await supabase
      .from('lawyer_accounts')
      .delete()
      .eq('id', lawyer_id)

    if (deleteError) {
      console.error('Error deleting lawyer:', deleteError)
      return new Response(JSON.stringify({ 
        error: `Database error: ${deleteError.message}`,
        details: deleteError.details || 'No additional details'
      }), {
        status: 500,
        headers: securityHeaders
      })
    }

    console.log('Lawyer deleted successfully')

    // Log the deletion for security
    try {
      await supabase.rpc('log_security_event', {
        event_type: 'lawyer_account_deleted',
        details: { 
          deleted_email: lawyerInfo.email,
          deleted_name: lawyerInfo.full_name,
          deleted_id: lawyer_id
        }
      })
    } catch (logError) {
      console.log('Logging error (non-critical):', logError)
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Abogado ${lawyerInfo.full_name} eliminado exitosamente`
    }), {
      headers: securityHeaders
    })

  } catch (error) {
    console.error('Delete lawyer error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: securityHeaders
    })
  }
})