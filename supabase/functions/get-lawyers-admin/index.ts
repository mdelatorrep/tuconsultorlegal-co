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

    // Verify the admin token
    const { data: tokenVerification, error: tokenError } = await supabase
      .from('lawyer_accounts')
      .select('id, is_admin, active')
      .eq('access_token', authHeader)
      .eq('is_admin', true)
      .eq('active', true)
      .single();

    if (tokenError || !tokenVerification) {
      return new Response(
        JSON.stringify({ error: 'Invalid admin token' }), 
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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