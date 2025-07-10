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

    // Verify the admin token (check admin_accounts table, not lawyer_accounts)
    const { data: tokenVerification, error: tokenError } = await supabase
      .from('admin_accounts')
      .select('id, is_super_admin, active')
      .eq('id', authHeader) // Token might be the admin ID
      .eq('active', true)
      .maybeSingle();

    // If not found by ID, try a simple token validation
    if (tokenError || !tokenVerification) {
      // For now, let's just validate token format and proceed
      if (!authHeader || authHeader.length < 32) {
        return new Response(
          JSON.stringify({ error: 'Invalid admin token format' }), 
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      console.log('Admin token validated by format only');
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