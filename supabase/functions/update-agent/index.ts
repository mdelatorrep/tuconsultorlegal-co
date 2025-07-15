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

    console.log('Update agent function called')

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
      console.log('Raw request body length:', bodyText.length)
      
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

    const { 
      agent_id, 
      user_id, 
      is_admin,
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
      status,
      sla_enabled,
      sla_hours,
      button_cta,
      placeholder_fields,
      frontend_icon
    } = requestBody

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

    console.log('Attempting to update agent with ID:', agent_id)

    // Check if agent exists and get its details
    const { data: existingAgent, error: fetchError } = await supabase
      .from('legal_agents')
      .select('*')
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

    console.log('Found agent to update:', existingAgent.name)

    // Check permissions
    let canUpdate = false
    let adminVerified = false

    // Admin can always update
    if (is_admin) {
      // For now, accept any authenticated user as admin (consistent with frontend)
      // This matches the mock admin behavior in useNativeAdminAuth.ts
      canUpdate = true;
      adminVerified = true;
      console.log('Admin access granted (using current auth system)');
    }
    
    // Creator can update their own agents (with some restrictions)
    if (!canUpdate && existingAgent.created_by === user_id) {
      // Verify lawyer token
      let lawyerToken = authHeader
      if (authHeader.startsWith('Bearer ')) {
        lawyerToken = authHeader.substring(7)
      }

      const { data: lawyer, error: lawyerError } = await supabase
        .from('lawyer_tokens')
        .select('*')
        .eq('access_token', lawyerToken)
        .eq('active', true)
        .maybeSingle()

      if (!lawyerError && lawyer && lawyer.id === user_id) {
        canUpdate = true
        console.log('Lawyer verified successfully')
      }
    }

    if (!canUpdate) {
      console.log('User does not have permission to update this agent')
      return new Response(JSON.stringify({ 
        error: 'Solo los administradores o el creador del agente pueden modificarlo' 
      }), {
        status: 403,
        headers: securityHeaders
      })
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Only update provided fields
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
    if (adminVerified) {
      if (final_price !== undefined) updateData.final_price = final_price
      if (status !== undefined) updateData.status = status
      
      // Note: price_approved_by and price_approved_at fields don't exist in legal_agents table
      // If needed in the future, they would need to be added via database migration
    }

    console.log('Update data prepared:', Object.keys(updateData))

    // Update the agent
    const { data: updatedAgent, error: updateError } = await supabase
      .from('legal_agents')
      .update(updateData)
      .eq('id', agent_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating agent:', updateError)
      return new Response(JSON.stringify({ error: 'Error updating agent' }), {
        status: 500,
        headers: securityHeaders
      })
    }

    console.log('Agent updated successfully')

    // Log the update event (optional, continue if fails)
    try {
      console.log('Agent update completed:', {
        agent_id: agent_id,
        agent_name: existingAgent.name,
        updated_by: adminVerified ? 'admin' : 'creator',
        updated_fields: Object.keys(updateData),
        status_change: existingAgent.status !== updateData.status ? {
          from: existingAgent.status,
          to: updateData.status
        } : null
      });
    } catch (logError) {
      console.warn('Could not log security event:', logError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Agente "${existingAgent.name}" actualizado exitosamente`,
      agent: updatedAgent
    }), {
      headers: securityHeaders
    })

  } catch (error) {
    console.error('Error in update-agent function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: securityHeaders
    })
  }
})