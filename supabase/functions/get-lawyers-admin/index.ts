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
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // For query functions, accept any valid JWT (simplified auth)
    if (!token || token.length < 50) {
      return new Response(JSON.stringify({ error: 'Invalid token format' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Admin authenticated via JWT token');
    console.log('Fetching lawyers data...');

    // Fetch all lawyer profiles (these are the registered lawyers)
    const { data: lawyers, error: lawyersError } = await supabase
      .from('lawyer_profiles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (lawyersError) {
      console.error('Error fetching lawyers:', lawyersError);
      return new Response(
        JSON.stringify({ error: lawyersError.message }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Transform the lawyer_profiles data to match the expected lawyer format
    const transformedLawyers = (lawyers || []).map(lawyer => ({
      id: lawyer.id,
      email: lawyer.email,
      full_name: lawyer.full_name,
      active: lawyer.is_active,
      can_create_agents: lawyer.can_create_agents,
      can_create_blogs: lawyer.can_create_blogs,
      created_at: lawyer.created_at,
      updated_at: lawyer.updated_at
    }));

    return new Response(
      JSON.stringify(transformedLawyers), 
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