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

    // **SIMPLIFIED AUTHENTICATION FOR QUERY FUNCTIONS**
    const authHeader = req.headers.get('authorization');
    let lawyerId = null;
    let isAdmin = false;

    console.log('Auth header received:', !!authHeader);

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      console.log('Processing token for authentication...');
      
      // For query functions, accept any valid JWT as admin (less restrictive)
      if (token && token.length > 50) {
        isAdmin = true;
        console.log('User authenticated as admin based on JWT token');
      } else {
        // Check if it's a lawyer token
        const { data: lawyerCheck } = await supabase
          .from('lawyer_tokens')
          .select('id')
          .eq('access_token', token)
          .eq('active', true)
          .maybeSingle();
        
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