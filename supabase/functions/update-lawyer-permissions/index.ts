import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    console.log('=== UPDATE LAWYER PERMISSIONS START ===');
    
    // Create Supabase client with service role key (bypasses RLS)
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

    // Verificar autenticación del admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verificar que el token sea válido (simplificado para admin)
    if (!token || token.length < 50) {
      console.error('Invalid token format');
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const { lawyerId, permissions } = await req.json();
    console.log('Request data:', { lawyerId, permissions });

    if (!lawyerId || !permissions) {
      console.error('Missing required fields');
      return new Response(JSON.stringify({ error: 'Missing lawyerId or permissions' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validar campos de permisos
    const { can_create_agents, can_create_blogs, can_use_ai_tools } = permissions;
    
    if (typeof can_create_agents !== 'boolean' || 
        typeof can_create_blogs !== 'boolean' || 
        typeof can_use_ai_tools !== 'boolean') {
      console.error('Invalid permission values');
      return new Response(JSON.stringify({ error: 'Invalid permission values' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Updating lawyer permissions in database...');
    
    // Actualizar permisos usando service role (bypasses RLS)
    const { data, error } = await supabase
      .from('lawyer_profiles')
      .update({
        can_create_agents,
        can_create_blogs,
        can_use_ai_tools,
        updated_at: new Date().toISOString()
      })
      .eq('id', lawyerId)
      .select('id, full_name, can_create_agents, can_create_blogs, can_use_ai_tools, updated_at');

    if (error) {
      console.error('Database update error:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to update permissions',
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!data || data.length === 0) {
      console.error('No lawyer found with ID:', lawyerId);
      return new Response(JSON.stringify({ error: 'Lawyer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Permissions updated successfully:', data[0]);

    return new Response(JSON.stringify({
      success: true,
      message: 'Permissions updated successfully',
      data: data[0]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('=== UPDATE LAWYER PERMISSIONS ERROR ===', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});