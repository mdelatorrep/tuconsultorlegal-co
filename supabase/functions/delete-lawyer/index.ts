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

    // Parse request body
    let requestBody
    try {
      const bodyText = await req.text()
      console.log('Raw request body:', bodyText)
      
      if (!bodyText || !bodyText.trim()) {
        console.error('Empty request body received')
        return new Response(JSON.stringify({ error: 'Request body is required' }), {
          status: 400,
          headers: securityHeaders
        })
      }
      
      requestBody = JSON.parse(bodyText)
      console.log('Parsed request body:', requestBody)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body' 
      }), {
        status: 400,
        headers: securityHeaders
      })
    }

    const { lawyer_id } = requestBody

    // Validate required fields
    if (!lawyer_id) {
      console.error('Missing lawyer_id in request')
      return new Response(JSON.stringify({ error: 'lawyer_id is required' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    console.log('Processing deletion for lawyer ID:', lawyer_id)

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
      console.log('Lawyer not found with ID:', lawyer_id)
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

    console.log('Lawyer deleted successfully:', existingLawyer.full_name)

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