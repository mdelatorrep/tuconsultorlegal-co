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

    // Extract the authorization header for lawyer identification
    const authHeader = req.headers.get('authorization');
    let lawyerId = null;
    let isAdmin = false;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      
      // Try to identify if it's an admin or lawyer token
      const { data: adminCheck } = await supabase
        .from('admin_accounts')
        .select('id, is_super_admin')
        .eq('id', token)
        .single();

      if (adminCheck) {
        isAdmin = true;
      } else {
        // Check if it's a lawyer token
        const { data: lawyerCheck } = await supabase
          .from('lawyer_tokens')
          .select('id')
          .eq('access_token', token)
          .single();
        
        if (lawyerCheck) {
          lawyerId = lawyerCheck.id;
        }
      }
    }

    console.log('Fetching agents data...', { isAdmin, lawyerId });

    let query = supabase
      .from('legal_agents')
      .select('*')
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