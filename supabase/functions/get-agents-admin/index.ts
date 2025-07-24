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

    // Extract the authorization header for authentication
    const authHeader = req.headers.get('authorization');
    let lawyerId = null;
    let isAdmin = false;

    console.log('Auth header received:', !!authHeader);

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      console.log('Processing token for authentication...');
      
      // For admin authentication, we currently accept any valid JWT token
      // This matches the current admin authentication system
      try {
        // Try to parse the JWT token to get user info
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('JWT payload parsed, user ID:', payload.sub);
        
        // For now, any authenticated user via Supabase Auth is treated as admin
        // This matches the behavior in useNativeAdminAuth.ts
        isAdmin = true;
        console.log('User authenticated as admin');
      } catch (jwtError) {
        console.log('Not a valid JWT, checking as lawyer token...');
        
        // Check if it's a lawyer token
        const { data: lawyerCheck } = await supabase
          .from('lawyer_tokens')
          .select('id')
          .eq('access_token', token)
          .single();
        
        if (lawyerCheck) {
          lawyerId = lawyerCheck.id;
          console.log('User authenticated as lawyer:', lawyerId);
        }
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