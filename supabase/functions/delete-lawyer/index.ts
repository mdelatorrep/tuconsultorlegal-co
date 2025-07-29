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

    console.log('🗑️ Delete lawyer function called - simplified auth system')

    // Parse request body
    let requestBody
    try {
      // Try to parse as JSON first
      requestBody = await req.json()
      console.log('Parsed request body:', requestBody)
    } catch (parseError) {
      console.error('JSON parse error, trying text:', parseError)
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
        console.log('Parsed request body from text:', requestBody)
      } catch (textParseError) {
        console.error('Text parse error:', textParseError)
        return new Response(JSON.stringify({ 
          error: 'Invalid JSON in request body' 
        }), {
          status: 400,
          headers: securityHeaders
        })
      }
    }

    // **SISTEMA DE AUTENTICACIÓN SIMPLIFICADO** - compatible con frontend
    const { lawyer_id, lawyerId } = requestBody
    
    // Aceptar tanto lawyer_id como lawyerId para flexibilidad del frontend
    const targetId = lawyer_id || lawyerId

    // Validate required fields
    if (!targetId) {
      console.error('Missing lawyer_id/lawyerId in request', { requestBody })
      return new Response(JSON.stringify({ error: 'lawyer_id or lawyerId is required' }), {
        status: 400,
        headers: securityHeaders
      })
    }

    console.log('Processing deletion for lawyer ID:', targetId)

    // Check if lawyer exists - buscar por lawyer_id en lugar de id
    const { data: existingLawyer, error: fetchError } = await supabase
      .from('lawyer_profiles')
      .select('id, full_name, email')
      .eq('id', targetId)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching lawyer:', fetchError)
      return new Response(JSON.stringify({ error: 'Error fetching lawyer data' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    if (!existingLawyer) {
      console.log('Lawyer not found with ID:', targetId)
      return new Response(JSON.stringify({ error: 'Lawyer not found' }), {
        status: 404,
        headers: securityHeaders
      })
    }

    console.log('Found lawyer to delete:', existingLawyer.full_name)

    // Delete the lawyer profile 
    const { error: deleteError } = await supabase
      .from('lawyer_profiles')
      .delete()
      .eq('id', targetId)

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