console.log('Admin login function starting...');

Deno.serve(async (req) => {
  console.log('Request received:', req.method);
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    console.log('CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('Invalid method');
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    console.log('Parsing request body...');
    const body = await req.json();
    console.log('Body parsed:', { email: body.email, hasPassword: !!body.password });

    // Simple test response
    return new Response(JSON.stringify({
      success: true,
      token: 'test-token-123',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: 'test-id',
        email: body.email,
        name: 'Test Admin',
        isAdmin: true,
        isSuperAdmin: true
      }
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error in admin login:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders
    });
  }
});