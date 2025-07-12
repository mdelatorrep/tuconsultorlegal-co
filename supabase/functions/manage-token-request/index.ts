import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const securityHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }), 
        { 
          status: 401, 
          headers: securityHeaders
        }
      );
    }

    const { requestId, action, rejectionReason, canCreateAgents } = await req.json()

    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }), 
        { 
          status: 400, 
          headers: securityHeaders
        }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the admin token using auth.users metadata
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error checking auth users:', authError)
      return new Response(
        JSON.stringify({ error: 'Authentication error' }), 
        { 
          status: 500, 
          headers: securityHeaders
        }
      )
    }

    const adminSession = authUsers.users.find(user => 
      user.user_metadata?.is_admin_session && 
      user.user_metadata?.session_token === authHeader
    )

    if (!adminSession) {
      return new Response(
        JSON.stringify({ error: 'Invalid admin token' }), 
        { 
          status: 403, 
          headers: securityHeaders
        }
      );
    }

    // Get admin account
    const { data: admin, error: adminError } = await supabase
      .from('admin_accounts')
      .select('id, full_name, active')
      .eq('id', adminSession.user_metadata?.admin_id)
      .eq('active', true)
      .maybeSingle()

    if (adminError || !admin) {
      return new Response(
        JSON.stringify({ error: 'Admin account not found' }), 
        { 
          status: 403, 
          headers: securityHeaders
        }
      );
    }

    // Get the token request
    const { data: request, error: requestError } = await supabase
      .from('lawyer_token_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'pending')
      .maybeSingle()

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: 'Token request not found or already processed' }), 
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
          reviewed_by: admin.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason || 'No reason provided'
        })
        .eq('id', requestId)

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update request' }), 
          { 
            status: 500, 
            headers: securityHeaders
          }
        );
      }

      // Log the action
      await supabase.rpc('log_security_event', {
        event_type: 'lawyer_token_request_rejected',
        user_id: admin.id,
        details: { 
          request_id: requestId,
          lawyer_email: request.email,
          reason: rejectionReason || 'No reason provided',
          reviewed_by: admin.full_name
        }
      })

      return new Response(
        JSON.stringify({ success: true, message: 'Request rejected successfully' }), 
        { headers: securityHeaders }
      );
    }

    if (action === 'approve') {
      // Generate secure access token
      const tokenBytes = new Uint8Array(32)
      crypto.getRandomValues(tokenBytes)
      const accessToken = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('')

      // Create lawyer token
      const { data: lawyerToken, error: tokenError } = await supabase
        .from('lawyer_tokens')
        .insert({
          lawyer_id: crypto.randomUUID(),
          full_name: request.full_name,
          email: request.email,
          phone_number: request.phone_number,
          access_token: accessToken,
          can_create_agents: canCreateAgents || false,
          request_id: requestId,
          created_by: admin.id
        })
        .select()
        .single()

      if (tokenError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create lawyer token: ' + tokenError.message }), 
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
          reviewed_by: admin.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update request status' }), 
          { 
            status: 500, 
            headers: securityHeaders
          }
        );
      }

      // Log the action
      await supabase.rpc('log_security_event', {
        event_type: 'lawyer_token_request_approved',
        user_id: admin.id,
        details: { 
          request_id: requestId,
          lawyer_email: request.email,
          lawyer_id: lawyerToken.lawyer_id,
          can_create_agents: canCreateAgents || false,
          reviewed_by: admin.full_name
        }
      })

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Request approved successfully',
          token: accessToken,
          lawyerId: lawyerToken.lawyer_id
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