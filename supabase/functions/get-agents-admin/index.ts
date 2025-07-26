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

    // **AUTHENTICATION - SAME PATTERN AS DELETE-AGENT**
    const authHeader = req.headers.get('authorization');
    let lawyerId = null;
    let isAdmin = false;

    console.log('Auth header received:', !!authHeader);

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check admin authentication first
    let adminToken = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      adminToken = authHeader.substring(7);
    }

    const { data: admin, error: adminError } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('session_token', adminToken)
      .eq('active', true)
      .maybeSingle();

    if (!adminError && admin) {
      // Check token expiration
      if (!admin.token_expires_at || new Date(admin.token_expires_at) >= new Date()) {
        isAdmin = true;
        console.log('User authenticated as admin via admin_accounts.session_token');
      }
    }

    // If not admin, check if it's a lawyer token
    if (!isAdmin) {
      const { data: lawyerCheck, error: lawyerError } = await supabase
        .from('lawyer_tokens')
        .select('id')
        .eq('access_token', adminToken)
        .eq('active', true)
        .maybeSingle();
      
      if (!lawyerError && lawyerCheck) {
        lawyerId = lawyerCheck.id;
        console.log('User authenticated as lawyer via lawyer_tokens.access_token:', lawyerId);
      } else {
        return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    console.log('Fetching agents data...', { isAdmin, lawyerId });

    let query = supabase
      .from('legal_agents')
      .select(`
        *,
        created_by_lawyer:lawyer_tokens!legal_agents_created_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    // If not admin, filter by created_by
    if (!isAdmin && lawyerId) {
      query = query.eq('created_by', lawyerId);
    }

    const { data: agents, error: agentsError } = await query;

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return new Response(
        JSON.stringify({ error: agentsError.message }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify(agents || []), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-agents-admin:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});