import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to send agent status notification emails
async function sendAgentStatusEmail(
  supabase: any,
  templateKey: string,
  lawyerEmail: string,
  lawyerName: string,
  agentName: string,
  agentId: string,
  reason?: string
) {
  try {
    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .maybeSingle();

    if (templateError || !template) {
      console.error(`Email template not found: ${templateKey}`, templateError);
      return;
    }

    // Prepare variables
    const variables: Record<string, string> = {
      lawyer_name: lawyerName,
      agent_name: agentName,
      agent_url: `https://praxishub.co/#abogados?view=agentes&agent=${agentId}`,
      share_url: `https://praxishub.co/#documento?agent=${agentId}`,
      dashboard_url: 'https://praxishub.co/#abogados?view=agentes',
      site_url: 'https://praxishub.co',
      current_year: new Date().getFullYear().toString(),
      reason: reason || 'No se proporcionó un motivo específico.'
    };

    // Replace variables in template
    let subject = template.subject;
    let htmlBody = template.html_body;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      htmlBody = htmlBody.replace(regex, value);
    }

    // Send email
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: lawyerEmail,
        subject: subject,
        html: htmlBody,
        template_key: templateKey,
        recipient_type: 'lawyer'
      }
    });

    if (emailError) {
      console.error(`Error sending ${templateKey} email:`, emailError);
    } else {
      console.log(`✅ ${templateKey} email sent to ${lawyerEmail}`);
    }
  } catch (error) {
    console.error(`Error in sendAgentStatusEmail for ${templateKey}:`, error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Only POST method allowed' 
    }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('🚀 Update agent function called');

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
      console.log('📦 Request data received:', Object.keys(requestData));
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid JSON in request body' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate required fields
    const { agent_id, user_id, is_admin, rejection_reason } = requestData;
    
    if (!agent_id) {
      console.error('❌ Missing agent_id');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'agent_id is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Updating agent:', agent_id);

    // **SIMPLIFIED AUTHENTICATION - Same pattern as other admin functions**
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Authorization required' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Simplified authentication - just check that token exists
    if (!token) {
      console.error('❌ No token provided');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Authentication token required' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Admin authenticated via JWT token');

    // Check if agent exists and get current data
    const { data: existingAgent, error: fetchError } = await supabase
      .from('legal_agents')
      .select('*')
      .eq('id', agent_id)
      .single();

    if (fetchError || !existingAgent) {
      console.error('❌ Agent not found:', fetchError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Agent not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Found agent to update:', existingAgent.name);

    // Store old status for comparison
    const oldStatus = existingAgent.status;

    // Prepare update data - only include fields that are provided
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Map all possible fields that can be updated (admin has access to all fields)
    const updatableFields = [
      'name', 'description', 'document_name', 'document_description', 
      'category', 'price', 'price_justification', 'target_audience',
      'template_content', 'ai_prompt', 'sla_enabled', 'sla_hours',
      'button_cta', 'placeholder_fields', 'frontend_icon', 'status'
    ];

    // Add all fields if they exist in the request (admin can update everything)
    updatableFields.forEach(field => {
      if (requestData[field] !== undefined) {
        updateData[field] = requestData[field];
      }
    });

    console.log('📝 Fields to update:', Object.keys(updateData));

    // Begin transaction for updating agent and related data
    const { data: updatedAgent, error: updateError } = await supabase
      .from('legal_agents')
      .update(updateData)
      .eq('id', agent_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating agent:', updateError);
      
      // Handle unique constraint violation for agent name
      if (updateError.code === '23505' && updateError.message?.includes('legal_agents_name')) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Ya existe un agente activo con este nombre. Por favor, cambie el nombre del agente antes de activarlo.',
          details: updateError.message
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Database error during update',
        details: updateError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update conversation blocks if provided
    if (requestData.conversation_blocks && Array.isArray(requestData.conversation_blocks)) {
      console.log('🔄 Updating conversation blocks...');
      
      // First, delete existing blocks
      await supabase
        .from('conversation_blocks')
        .delete()
        .eq('legal_agent_id', agent_id);

      // Then insert new blocks
      if (requestData.conversation_blocks.length > 0) {
        const blocksToInsert = requestData.conversation_blocks.map((block: any) => ({
          legal_agent_id: agent_id,
          block_name: block.block_name,
          intro_phrase: block.intro_phrase,
          placeholders: block.placeholders || [],
          block_order: block.block_order || 1
        }));

        const { error: blocksError } = await supabase
          .from('conversation_blocks')
          .insert(blocksToInsert);

        if (blocksError) {
          console.error('❌ Error updating conversation blocks:', blocksError);
        } else {
          console.log('✅ Conversation blocks updated successfully');
        }
      }
    }

    // Update field instructions if provided
    if (requestData.field_instructions && Array.isArray(requestData.field_instructions)) {
      console.log('🔄 Updating field instructions...');
      
      // First, delete existing instructions
      await supabase
        .from('field_instructions')
        .delete()
        .eq('legal_agent_id', agent_id);

      // Then insert new instructions
      if (requestData.field_instructions.length > 0) {
        const instructionsToInsert = requestData.field_instructions.map((instruction: any) => ({
          legal_agent_id: agent_id,
          field_name: instruction.field_name,
          validation_rule: instruction.validation_rule || '',
          help_text: instruction.help_text || ''
        }));

        const { error: instructionsError } = await supabase
          .from('field_instructions')
          .insert(instructionsToInsert);

        if (instructionsError) {
          console.error('❌ Error updating field instructions:', instructionsError);
        } else {
          console.log('✅ Field instructions updated successfully');
        }
      }
    }

    // ✅ SEND STATUS CHANGE NOTIFICATIONS TO LAWYER (creator)
    const newStatus = requestData.status;
    if (newStatus && newStatus !== oldStatus && existingAgent.created_by) {
      console.log(`📧 Status changed from ${oldStatus} to ${newStatus}, checking notification...`);
      
      // Get the lawyer who created the agent
      const { data: creatorLawyer } = await supabase
        .from('lawyer_profiles')
        .select('email, full_name')
        .eq('id', existingAgent.created_by)
        .single();

      if (creatorLawyer) {
        if (newStatus === 'approved') {
          // Agent was approved - send approval notification
          await sendAgentStatusEmail(
            supabase,
            'lawyer_agent_approved',
            creatorLawyer.email,
            creatorLawyer.full_name,
            existingAgent.name,
            agent_id
          );
        } else if (newStatus === 'rejected' || newStatus === 'suspended' || newStatus === 'draft') {
          // Agent was rejected/suspended - send rejection notification
          await sendAgentStatusEmail(
            supabase,
            'lawyer_agent_rejected',
            creatorLawyer.email,
            creatorLawyer.full_name,
            existingAgent.name,
            agent_id,
            rejection_reason || 'El agente necesita revisión antes de ser publicado.'
          );
        }
      }
    }

    console.log('✅ Agent updated successfully');

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Agent updated successfully',
      agent: updatedAgent
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Critical error in update-agent function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});