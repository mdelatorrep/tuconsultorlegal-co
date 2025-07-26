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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: securityHeaders 
    })
  }

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🚀 Update agent function called')

    // Parse request body
    let requestBody
    try {
      const bodyText = await req.text()
      console.log('📦 Raw request body length:', bodyText.length)
      
      if (!bodyText.trim()) {
        console.error('❌ Empty request body')
        return new Response(JSON.stringify({ error: 'Request body cannot be empty' }), {
          status: 400,
          headers: securityHeaders
        })
      }
      
      requestBody = JSON.parse(bodyText)
      console.log('✅ Request body parsed successfully')
      console.log('📋 Request data keys:', Object.keys(requestBody))
      console.log('📋 Full request body:', JSON.stringify(requestBody, null, 2))
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError)
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        details: parseError.message 
      }), {
        status: 400,
        headers: securityHeaders
      })
    }

    // Extract required fields
    const { 
      agent_id, 
      user_id, 
      is_admin,
      status,
      // Optional fields for updates
      name,
      description,
      document_name,
      document_description,
      category,
      suggested_price,
      final_price,
      price_justification,
      target_audience,
      template_content,
      ai_prompt,
      sla_enabled,
      sla_hours,
      button_cta,
      placeholder_fields,
      frontend_icon
    } = requestBody

    // Validate required fields
    if (!agent_id) {
      console.error('❌ Missing agent_id')
      return new Response(JSON.stringify({ 
        error: 'agent_id is required',
        success: false 
      }), {
        status: 400,
        headers: securityHeaders
      })
    }

    console.log('🔍 Attempting to update agent:', agent_id)

    // Check if agent exists
    const { data: existingAgent, error: fetchError } = await supabase
      .from('legal_agents')
      .select('*')
      .eq('id', agent_id)
      .maybeSingle()

    if (fetchError) {
      console.error('❌ Error fetching agent:', fetchError)
      return new Response(JSON.stringify({ 
        error: 'Database error while fetching agent',
        details: fetchError.message,
        success: false
      }), {
        status: 500,
        headers: securityHeaders
      })
    }

    if (!existingAgent) {
      console.error('❌ Agent not found:', agent_id)
      return new Response(JSON.stringify({ 
        error: 'Agent not found',
        success: false 
      }), {
        status: 404,
        headers: securityHeaders
      })
    }

    console.log('✅ Found agent to update:', existingAgent.name)

    // **AUTHORIZATION LOGIC - SIMPLIFIED FOR UPDATE**
    const authHeader = req.headers.get('authorization')
    console.log('🔑 Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.error('❌ No authorization header')
      return new Response(JSON.stringify({ 
        error: 'Authorization required',
        success: false
      }), {
        status: 401,
        headers: securityHeaders
      })
    }

    // Extract token
    let token = authHeader
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    // Check permissions - Admin can update any agent, lawyers can only update their own
    let canUpdate = false
    let isVerifiedAdmin = false
    let isVerifiedLawyer = false
    let verifiedUser = null
    let updateReason = 'unknown'

    if (is_admin) {
      // For admin: use the JWT token directly (simplified auth for query/modification functions)
      if (token && token.length > 50) {
        isVerifiedAdmin = true
        canUpdate = true
        updateReason = 'admin_jwt'
        console.log('✅ Admin verified via JWT token, can update any agent')
      }
    } else {
      // Check if lawyer can update their own agent using lawyer_tokens table
      const { data: lawyer, error: lawyerError } = await supabase
        .from('lawyer_tokens')
        .select('*')
        .eq('access_token', token)
        .eq('active', true)
        .maybeSingle()

      if (!lawyerError && lawyer && lawyer.id === existingAgent.created_by) {
        isVerifiedLawyer = true
        canUpdate = true
        verifiedUser = lawyer
        updateReason = 'lawyer_token'
        console.log('✅ Lawyer verified, can update own agent')
      }
    }

    if (!canUpdate) {
      console.log('❌ User cannot update agent - insufficient permissions')
      return new Response(JSON.stringify({ 
        error: is_admin 
          ? 'Token de administrador inválido' 
          : 'Solo puedes editar agentes que tú has creado',
        success: false
      }), {
        status: 403,
        headers: securityHeaders
      })
    }

    console.log('✅ Proceeding with update by verified user')

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Add fields that are provided (only update non-undefined fields)
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (document_name !== undefined) updateData.document_name = document_name
    if (document_description !== undefined) updateData.document_description = document_description
    if (category !== undefined) updateData.category = category
    if (suggested_price !== undefined) updateData.suggested_price = suggested_price
    if (price_justification !== undefined) updateData.price_justification = price_justification
    if (target_audience !== undefined) updateData.target_audience = target_audience
    if (template_content !== undefined) updateData.template_content = template_content
    if (ai_prompt !== undefined) updateData.ai_prompt = ai_prompt
    if (sla_enabled !== undefined) updateData.sla_enabled = sla_enabled
    if (sla_hours !== undefined) updateData.sla_hours = sla_hours
    if (button_cta !== undefined) updateData.button_cta = button_cta
    if (placeholder_fields !== undefined) updateData.placeholder_fields = placeholder_fields
    if (frontend_icon !== undefined) updateData.frontend_icon = frontend_icon

    // Admin-only fields
    if (is_admin) {
      if (final_price !== undefined) updateData.final_price = final_price
      if (status !== undefined) updateData.status = status
    }

    console.log('📝 Update data prepared:', Object.keys(updateData))
    console.log('🎯 Status change:', status ? `${existingAgent.status} → ${status}` : 'no status change')

    // Perform the update
    const { data: updatedAgent, error: updateError } = await supabase
      .from('legal_agents')
      .update(updateData)
      .eq('id', agent_id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating agent:', updateError)
      return new Response(JSON.stringify({ 
        error: 'Database error during update',
        details: updateError.message,
        success: false
      }), {
        status: 500,
        headers: securityHeaders
      })
    }

    console.log('✅ Agent updated successfully')

    // Log the successful operation
    console.log('📊 Update completed:', {
      agent_id: agent_id,
      agent_name: existingAgent.name,
      updated_by: updateReason,
      updated_fields: Object.keys(updateData),
      status_changed: existingAgent.status !== updateData.status
    })

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: `Agente "${existingAgent.name}" actualizado exitosamente`,
      agent: updatedAgent,
      updated_fields: Object.keys(updateData)
    }), {
      headers: securityHeaders
    })

  } catch (error) {
    console.error('💥 Critical error in update-agent function:', error)
    console.error('💥 Error stack:', error.stack)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred while updating the agent',
      success: false
    }), {
      status: 500,
      headers: securityHeaders
    })
  }
})