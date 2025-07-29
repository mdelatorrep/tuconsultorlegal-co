import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const securityHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, requestId, rejectionReason } = await req.json()

    if (!action || !requestId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }), 
        { 
          status: 400, 
          headers: securityHeaders
        }
      );
    }

    // Get the request details
    const { data: request, error: requestError } = await supabase
      .from('lawyer_token_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError || !request) {
      console.error('Request fetch error:', requestError);
      return new Response(
        JSON.stringify({ error: 'Request not found' }), 
        { 
          status: 404, 
          headers: securityHeaders
        }
      );
    }

    if (action === 'reject') {
      // Update request status to rejected
      const { error: updateError } = await supabase
        .from('lawyer_token_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason || 'No reason provided'
        })
        .eq('id', requestId)

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update request' }), 
          { 
            status: 500, 
            headers: securityHeaders
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Request rejected successfully' }), 
        { headers: securityHeaders }
      );
    }

    if (action === 'approve') {
      // Generate secure access token using cryptographically secure method
      const { data: tokenResult, error: tokenGenError } = await supabase
        .rpc('generate_secure_lawyer_token');
      
      if (tokenGenError || !tokenResult) {
        console.error('Token generation error:', tokenGenError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate secure token' }), 
          { 
            status: 500, 
            headers: securityHeaders
          }
        );
      }
      
      const accessToken = tokenResult;
      const lawyerId = crypto.randomUUID();

      // Create lawyer profile directly
      const { data: lawyerProfile, error: profileError } = await supabase
        .from('lawyer_profiles')
        .insert({
          id: lawyerId,
          full_name: request.full_name,
          email: request.email,
          phone_number: request.phone_number,
          can_create_agents: false,
          can_create_blogs: false,
          can_use_ai_tools: false,
          active: true,
          is_active: true
        })
        .select()
        .single()

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return new Response(
          JSON.stringify({ error: 'Failed to create lawyer profile' }), 
          { 
            status: 500, 
            headers: securityHeaders
          }
        );
      }

      // Update request status to approved
      const { error: updateError } = await supabase
        .from('lawyer_token_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update request status' }), 
          { 
            status: 500, 
            headers: securityHeaders
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Request approved successfully',
          token: accessToken,
          lawyerId: lawyerId
        }), 
        { headers: securityHeaders }
      );
    }

  } catch (error) {
    console.error('Error in manage-token-request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: securityHeaders
      }
    );
  }
});