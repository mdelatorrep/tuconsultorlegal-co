import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { agent_id, user_id, is_admin } = requestData;
    
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

    // Verify authentication
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

    // Create authenticated client to verify user
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { 
            Authorization: authHeader 
          } 
        } 
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      console.error('❌ Invalid or expired token:', authError?.message);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid or expired authentication token' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ User authenticated:', user.email);

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

    // Check user permissions
    const isUserAdmin = user.app_metadata?.roles?.includes('admin') || 
                       user.app_metadata?.roles?.includes('super_admin') ||
                       is_admin === true;

    let canUpdate = false;
    if (isUserAdmin) {
      canUpdate = true;
      console.log('✅ Admin user, can update any agent');
    } else if (existingAgent.created_by === user.id) {
      canUpdate = true;
      console.log('✅ Agent creator, can update own agent');
    }

    if (!canUpdate) {
      console.error('❌ Insufficient permissions');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Insufficient permissions to update this agent' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Prepare update data - only include fields that are provided
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Map all possible fields that can be updated
    const updatableFields = [
      'name', 'description', 'document_name', 'document_description', 
      'category', 'suggested_price', 'price_justification', 'target_audience',
      'template_content', 'ai_prompt', 'sla_enabled', 'sla_hours',
      'button_cta', 'placeholder_fields', 'frontend_icon'
    ];

    // Admin-only fields
    const adminOnlyFields = ['final_price', 'status'];

    // Add regular fields if they exist in the request
    updatableFields.forEach(field => {
      if (requestData[field] !== undefined) {
        updateData[field] = requestData[field];
      }
    });

    // Add admin-only fields if user is admin
    if (isUserAdmin) {
      adminOnlyFields.forEach(field => {
        if (requestData[field] !== undefined) {
          updateData[field] = requestData[field];
        }
      });
    }

    console.log('📝 Fields to update:', Object.keys(updateData));

    // Perform the update
    const { data: updatedAgent, error: updateError } = await supabase
      .from('legal_agents')
      .update(updateData)
      .eq('id', agent_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating agent:', updateError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Database error during update',
        details: updateError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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