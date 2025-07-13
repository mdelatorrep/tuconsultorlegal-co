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

    console.log('Delete lawyer function called')

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

    const { lawyer_id } = requestBody

    // Input validation
    if (!lawyer_id) {
      return new Response(JSON.stringify({ error: 'Lawyer ID is required' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    console.log('Attempting to delete lawyer with ID:', lawyer_id)

    // Check if lawyer exists
    const { data: existingLawyer, error: fetchError } = await supabase
      .from('lawyer_tokens')
      .select('id, full_name, email')
      .eq('id', lawyer_id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching lawyer:', fetchError)
      return new Response(JSON.stringify({ error: 'Error fetching lawyer data' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    if (!existingLawyer) {
      return new Response(JSON.stringify({ error: 'Lawyer not found' }), {
        status: 404,
        headers: securityHeaders
      })
    }

    console.log('Found lawyer to delete:', existingLawyer.full_name)

    // Delete the lawyer account
    const { error: deleteError } = await supabase
      .from('lawyer_tokens')
      .delete()
      .eq('id', lawyer_id)

    if (deleteError) {
      console.error('Error deleting lawyer:', deleteError)
      return new Response(JSON.stringify({ error: 'Error deleting lawyer account' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    console.log('Lawyer deleted successfully')

    // Note: log_security_event RPC function doesn't exist yet
    // TODO: Implement security event logging
    /*
    await supabase.rpc('log_security_event', {
      event_type: 'lawyer_deleted',
      user_id: admin.id,
      details: { 
        deleted_lawyer_id: lawyer_id,
        deleted_lawyer_name: existingLawyer.full_name,
        deleted_lawyer_email: existingLawyer.email,
        admin_email: admin.email
      }
    })
    */

    return new Response(JSON.stringify({
      success: true,
      message: `Abogado ${existingLawyer.full_name} eliminado exitosamente`
    }), {
      headers: securityHeaders
    })

  } catch (error) {
    console.error('Error in delete-lawyer function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: securityHeaders
    })
  }
})