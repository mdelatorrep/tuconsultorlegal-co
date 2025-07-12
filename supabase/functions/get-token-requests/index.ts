import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client with service role key for admin operations
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify admin account still exists and is active
    const { data: admin } = await supabase
      .from('admin_accounts')
      .select('id, is_super_admin, active')
      .eq('id', adminSession.user_metadata?.admin_id)
      .eq('active', true)
      .maybeSingle()

    if (!admin) {
      return new Response(
        JSON.stringify({ error: 'Admin account not found' }), 
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch all token requests (bypassing RLS with service role)
    const { data: requests, error: requestsError } = await supabase
      .from('lawyer_token_requests')
      .select(`
        *,
        reviewed_by:admin_accounts!lawyer_token_requests_reviewed_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false });

    if (requestsError) {
      return new Response(
        JSON.stringify({ error: requestsError.message }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify(requests), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-token-requests:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});