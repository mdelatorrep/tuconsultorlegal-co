import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

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

    // Extract token from Bearer format or use directly
    const adminToken = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader

    console.log('Verifying admin token for lawyers query...')

    // Verify token against admin_accounts table
    const { data: admin, error: tokenError } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('session_token', adminToken)
      .eq('active', true)
      .maybeSingle()

    if (tokenError || !admin) {
      console.error('Admin token verification failed:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Invalid admin token' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check token expiration
    if (admin.token_expires_at && new Date(admin.token_expires_at) < new Date()) {
      console.error('Admin token expired')
      return new Response(
        JSON.stringify({ error: 'Admin token expired' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Admin token verified, fetching lawyers...')

    // Fetch all lawyers (bypassing RLS with service role)
    const { data: lawyers, error: lawyersError } = await supabase
      .from('lawyer_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (lawyersError) {
      return new Response(
        JSON.stringify({ error: lawyersError.message }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify(lawyers), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-lawyers-admin:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});